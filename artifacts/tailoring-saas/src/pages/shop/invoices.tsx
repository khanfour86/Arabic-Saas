import React, { useState } from 'react';
import { useListInvoices, useGetInvoice, useMarkInvoiceDelivered, useGetWhatsappMessage, ListInvoicesStatus } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, FileText, CheckCircle, MessageCircle, ChevronLeft, Calendar, Scissors } from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function InvoicesList() {
  const [statusFilter, setStatusFilter] = useState<ListInvoicesStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const isNumber = debouncedSearch && !isNaN(Number(debouncedSearch));
  
  const { data, isLoading } = useListInvoices({ 
    status: statusFilter === 'all' ? undefined : statusFilter,
    phone: isNumber && debouncedSearch.length >= 8 ? debouncedSearch : undefined,
    invoiceNumber: isNumber && debouncedSearch.length < 8 ? debouncedSearch : undefined,
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">الفواتير</h1>
        <p className="text-muted-foreground mt-1">إدارة ومتابعة طلبات العملاء</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            className="h-14 pl-4 pr-12 rounded-2xl bg-white shadow-sm border-0 focus-visible:ring-primary"
            placeholder="رقم الفاتورة أو هاتف العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex p-1 bg-muted/50 rounded-2xl overflow-x-auto shrink-0">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'under_tailoring', label: 'تحت الخياطة' },
            { id: 'ready', label: 'جاهز' },
            { id: 'delivered', label: 'مسلم' }
          ].map(f => (
            <button
              key={f.id}
              className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${
                statusFilter === f.id ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setStatusFilter(f.id as any)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data?.invoices.map(inv => (
            <Link key={inv.id} href={`/shop/invoices/${inv.id}`}>
              <Card className="hover-elevate cursor-pointer border-0 shadow-md hover:shadow-xl transition-all rounded-2xl overflow-hidden group">
                <div className={`w-2 h-full absolute right-0 top-0 ${
                  inv.status === 'ready' ? 'bg-emerald-400' :
                  inv.status === 'delivered' ? 'bg-blue-400' :
                  'bg-accent'
                }`} />
                <CardContent className="p-6 pr-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-xl font-display">#{inv.invoiceNumber}</h3>
                        <Badge variant="outline" className={`border-0 ${
                          inv.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                          inv.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                          'bg-accent/20 text-accent-foreground'
                        }`}>
                          {inv.status === 'ready' ? 'جاهز للتسليم' : inv.status === 'delivered' ? 'تم التسليم' : 'تحت الخياطة'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{inv.customerName} - <span dir="ltr">{inv.customerPhone}</span></p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-0 pt-4 md:pt-0 border-border">
                    <div className="text-center md:text-left">
                      <div className="text-xs text-muted-foreground mb-1">الإجمالي</div>
                      <div className="font-bold text-lg text-primary">{inv.totalAmount} د.ك</div>
                    </div>
                    <div className="text-center md:text-left">
                      <div className="text-xs text-muted-foreground mb-1">المتبقي</div>
                      <div className={`font-bold text-lg ${inv.remainingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {inv.remainingAmount} د.ك
                      </div>
                    </div>
                    <ChevronLeft className="text-muted-foreground group-hover:text-primary transition-colors hidden md:block" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {data?.invoices.length === 0 && (
            <div className="text-center p-12 bg-white rounded-2xl shadow-sm text-muted-foreground">
              لا توجد فواتير مطابقة
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InvoiceDetail() {
  const params = useParams();
  const invoiceId = parseInt(params.id || '0');
  const { data: inv, isLoading } = useGetInvoice(invoiceId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const deliverMutation = useMarkInvoiceDelivered({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/invoices/${invoiceId}`] });
        toast({ title: 'تم تسليم الفاتورة بنجاح' });
      }
    }
  });

  const { refetch: getWhatsapp } = useGetWhatsappMessage(invoiceId, { query: { enabled: false } });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!inv) return <div>لا توجد فاتورة</div>;

  const handleWhatsapp = async () => {
    const res = await getWhatsapp();
    if (res.data) {
      navigator.clipboard.writeText(res.data.message);
      toast({ title: 'تم نسخ الرسالة', description: 'يمكنك لصقها في واتساب الآن' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/shop/invoices" className="inline-flex items-center text-muted-foreground hover:text-primary mb-2">
        <ChevronLeft className="w-4 h-4 ml-1" /> عودة للفواتير
      </Link>

      <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-full h-32 bg-primary z-0" />
        <CardContent className="p-0 relative z-10">
          
          {/* Header */}
          <div className="p-8 text-primary-foreground flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="text-primary-foreground/70 text-sm mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(inv.createdAt), 'yyyy/MM/dd HH:mm')}
              </div>
              <h1 className="text-4xl font-display font-bold mb-2">فاتورة #{inv.invoiceNumber}</h1>
              <div className="flex items-center gap-3">
                <Badge className={`border-0 px-3 py-1 text-sm ${
                  inv.status === 'ready' ? 'bg-emerald-400 text-emerald-950' :
                  inv.status === 'delivered' ? 'bg-blue-400 text-blue-950' :
                  'bg-white text-primary'
                }`}>
                  {inv.status === 'ready' ? 'جاهز للتسليم' : inv.status === 'delivered' ? 'تم التسليم' : 'تحت الخياطة'}
                </Badge>
                {inv.status === 'ready' && inv.allSubOrdersReady && (
                  <Badge className="bg-accent text-accent-foreground border-0">الكل جاهز</Badge>
                )}
              </div>
            </div>
            
            <div className="bg-white text-foreground p-4 rounded-2xl shadow-lg min-w-[250px]">
              <div className="flex justify-between items-center mb-2 pb-2 border-b">
                <span className="text-muted-foreground text-sm">العميل</span>
                <Link href={`/shop/customers/${inv.customerId}`} className="font-bold hover:text-primary">{inv.customerName}</Link>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">الهاتف</span>
                <span className="font-bold" dir="ltr">{inv.customerPhone}</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-background">
            <h3 className="font-display font-bold text-xl mb-4 text-primary">تفاصيل الطلبات ({inv.subOrders.length})</h3>
            <div className="space-y-4">
              {inv.subOrders.map(sub => (
                <div key={sub.id} className="bg-white border border-border/50 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${sub.status === 'ready' ? 'bg-emerald-100' : 'bg-muted'}`}>
                      {sub.status === 'ready' ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : <Scissors className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{sub.profileName}</span>
                        <span className="text-sm text-muted-foreground">({sub.subOrderNumber})</span>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span className="bg-muted px-2 py-1 rounded-md">الكمية: {sub.quantity}</span>
                        <span className="bg-muted px-2 py-1 rounded-md">{sub.fabricSource === 'shop_fabric' ? 'قماش المحل' : 'قماش العميل'}</span>
                        {sub.fabricDescription && <span>{sub.fabricDescription}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center text-left min-w-[100px] border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-xs text-muted-foreground">قيمة الطلب</div>
                    <div className="font-bold text-lg">{sub.price} د.ك</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Actions */}
            <div className="mt-8 bg-primary/5 rounded-3xl p-6 border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex gap-8 w-full md:w-auto justify-around">
                <div className="text-center">
                  <div className="text-muted-foreground text-sm mb-1">الإجمالي</div>
                  <div className="text-2xl font-bold">{inv.totalAmount} د.ك</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-sm mb-1">المدفوع</div>
                  <div className="text-2xl font-bold text-emerald-600">{inv.paidAmount} د.ك</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-sm mb-1">المتبقي</div>
                  <div className={`text-2xl font-bold ${inv.remainingAmount > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{inv.remainingAmount} د.ك</div>
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                {inv.status === 'ready' && (
                  <>
                    <Button 
                      variant="outline" 
                      className="rounded-xl h-14 flex-1 md:flex-none border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                      onClick={handleWhatsapp}
                    >
                      <MessageCircle className="w-5 h-5 ml-2" /> واتساب
                    </Button>
                    <Button 
                      className="rounded-xl h-14 flex-1 md:flex-none bg-primary text-white hover:bg-primary/90 shadow-lg"
                      onClick={() => deliverMutation.mutate({ invoiceId })}
                      disabled={deliverMutation.isPending}
                    >
                      {deliverMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5 ml-2"/> تسليم للعميل</>}
                    </Button>
                  </>
                )}
                {inv.status === 'delivered' && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-base py-2 px-6 rounded-xl">
                    تم التسليم بنجاح
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
