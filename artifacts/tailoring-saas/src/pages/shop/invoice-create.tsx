import React, { useState } from 'react';
import { useGetCustomer, useCreateInvoice, CreateSubOrderInput } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation, useSearch } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Save, User, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function InvoiceCreate() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const customerId = parseInt(params.get('customerId') || '0');
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customer, isLoading: customerLoading } = useGetCustomer(customerId, {
    query: { enabled: !!customerId }
  });

  const [subOrders, setSubOrders] = useState<CreateSubOrderInput[]>([
    { profileId: 0, quantity: 1, fabricSource: 'shop_fabric', fabricDescription: '', price: 0, paidAmount: 0 }
  ]);

  const mutation = useCreateInvoice({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/shop/dashboard'] });
        toast({ title: 'تم إنشاء الفاتورة بنجاح', description: `رقم الفاتورة: ${data.invoiceNumber}` });
        setLocation(`/shop/invoices/${data.id}`);
      },
      onError: (err) => toast({ title: 'خطأ', description: err.message, variant: 'destructive' })
    }
  });

  if (!customerId) return <div className="p-12 text-center text-red-500">يجب اختيار عميل أولاً</div>;
  if (customerLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!customer) return <div>العميل غير موجود</div>;

  const totalAmount = subOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  const totalPaid = subOrders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);

  const handleSubmit = () => {
    if (subOrders.some(o => !o.profileId)) {
      toast({ title: 'خطأ', description: 'يجب اختيار ملف القياس لكل طلب', variant: 'destructive' });
      return;
    }
    mutation.mutate({
      data: {
        customerId,
        subOrders,
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Scissors className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">إنشاء فاتورة جديدة</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground font-medium">
            <User className="w-4 h-4" /> {customer.name} - <span dir="ltr">{customer.phone}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {subOrders.map((order, index) => (
          <Card key={index} className="border-0 shadow-lg rounded-2xl overflow-visible relative z-10">
            <div className="absolute -right-3 -top-3 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold shadow-md">
              {index + 1}
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold">ملف القياس (الشخص)</label>
                  <Select 
                    value={order.profileId ? order.profileId.toString() : ''} 
                    onValueChange={(v) => {
                      const newOrders = [...subOrders];
                      newOrders[index].profileId = parseInt(v);
                      setSubOrders(newOrders);
                    }}
                  >
                    <SelectTrigger className="h-14 bg-muted/50 rounded-xl text-lg font-bold" dir="rtl">
                      <SelectValue placeholder="اختر الشخص..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {customer.profiles.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name} {p.isMain ? '(رئيسي)' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">الكمية (عدد الدشاديش)</label>
                  <Input 
                    type="number" min="1" 
                    value={order.quantity}
                    onChange={(e) => {
                      const newOrders = [...subOrders];
                      newOrders[index].quantity = parseInt(e.target.value) || 1;
                      setSubOrders(newOrders);
                    }}
                    className="h-14 bg-muted/50 rounded-xl text-center text-lg font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">مصدر القماش</label>
                  <Select 
                    value={order.fabricSource} 
                    onValueChange={(v: any) => {
                      const newOrders = [...subOrders];
                      newOrders[index].fabricSource = v;
                      setSubOrders(newOrders);
                    }}
                  >
                    <SelectTrigger className="h-14 bg-muted/50 rounded-xl font-bold" dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="shop_fabric">قماش المحل</SelectItem>
                      <SelectItem value="customer_fabric">قماش العميل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold">تفاصيل القماش / ملاحظات التفصيل</label>
                  <Input 
                    value={order.fabricDescription || ''}
                    onChange={(e) => {
                      const newOrders = [...subOrders];
                      newOrders[index].fabricDescription = e.target.value;
                      setSubOrders(newOrders);
                    }}
                    className="h-14 bg-muted/50 rounded-xl"
                    placeholder="لون، رقم القماش، نوع التفصيل..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-primary">السعر الإجمالي للطلب</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={order.price || ''}
                      onChange={(e) => {
                        const newOrders = [...subOrders];
                        newOrders[index].price = parseFloat(e.target.value) || 0;
                        setSubOrders(newOrders);
                      }}
                      className="h-14 pl-12 bg-white border-primary/30 focus-visible:ring-primary rounded-xl text-xl font-bold text-primary"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">د.ك</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-600">المبلغ المدفوع (مقدم)</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={order.paidAmount || ''}
                      onChange={(e) => {
                        const newOrders = [...subOrders];
                        newOrders[index].paidAmount = parseFloat(e.target.value) || 0;
                        setSubOrders(newOrders);
                      }}
                      className="h-14 pl-12 bg-white border-emerald-500/30 focus-visible:ring-emerald-500 rounded-xl text-xl font-bold text-emerald-600"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">د.ك</span>
                  </div>
                </div>

              </div>
              
              {subOrders.length > 1 && (
                <div className="mt-6 pt-4 border-t border-border text-left">
                  <Button 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      const newOrders = [...subOrders];
                      newOrders.splice(index, 1);
                      setSubOrders(newOrders);
                    }}
                  >
                    <Trash2 className="w-4 h-4 ml-2" /> إزالة هذا الطلب
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button 
          variant="outline" 
          className="w-full h-14 border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 rounded-2xl font-bold text-lg"
          onClick={() => setSubOrders([...subOrders, { profileId: 0, quantity: 1, fabricSource: 'shop_fabric', fabricDescription: '', price: 0, paidAmount: 0 }])}
        >
          <Plus className="w-5 h-5 ml-2" /> إضافة طلب آخر لنفس العميل
        </Button>
      </div>

      {/* Sticky Bottom Bar for Totals & Submit */}
      <div className="sticky bottom-4 md:bottom-8 mt-12 bg-white/80 backdrop-blur-xl border border-border shadow-2xl rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-40">
        <div className="flex gap-6 w-full md:w-auto px-4 justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">إجمالي الفاتورة</div>
            <div className="text-2xl font-display font-bold text-primary">{totalAmount} د.ك</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-bold">المدفوع</div>
            <div className="text-2xl font-display font-bold text-emerald-600">{totalPaid} د.ك</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-bold">المتبقي</div>
            <div className="text-2xl font-display font-bold text-red-500">{totalAmount - totalPaid} د.ك</div>
          </div>
        </div>
        
        <Button 
          className="w-full md:w-auto h-14 px-12 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 ml-2" /> حفظ وإصدار الفاتورة</>}
        </Button>
      </div>
    </div>
  );
}
