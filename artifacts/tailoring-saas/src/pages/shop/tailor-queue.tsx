import React from 'react';
import { useGetTailorQueue, useMarkSubOrderReady } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Scissors, CheckCircle, Loader2, User, Ruler } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function TailorQueue() {
  const { data, isLoading } = useGetTailorQueue();
  
  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg">
          <Scissors className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">قائمة العمل (الخياط)</h1>
          <p className="text-muted-foreground mt-1">الطلبات المجدولة للتفصيل</p>
        </div>
      </div>

      {!data?.items?.length ? (
        <div className="text-center p-16 bg-white rounded-3xl shadow-sm border border-border/50">
          <CheckCircle className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
          <h3 className="text-2xl font-display font-bold text-foreground">لا يوجد عمل حالياً</h3>
          <p className="text-muted-foreground">جميع الطلبات جاهزة!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map(item => (
            <Card key={item.invoiceId} className="border-0 shadow-md rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors group">
                      <div className="flex flex-col md:flex-row md:items-center justify-between w-full pr-4 text-right gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-display font-bold text-xl text-primary">#{item.invoiceNumber}</span>
                          <Badge variant="secondary" className="rounded-full bg-accent/20 text-accent-foreground border-0">
                            {item.subOrders.length} طلبات
                          </Badge>
                        </div>
                        <div className="text-muted-foreground font-medium text-sm flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {item.customerName}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 bg-muted/10 border-t border-border">
                      <div className="space-y-6 pt-4">
                        {item.subOrders.map(sub => (
                          <TailorSubOrderCard key={sub.id} subOrder={sub} invoiceId={item.invoiceId} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TailorSubOrderCard({ subOrder, invoiceId }: { subOrder: any, invoiceId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useMarkSubOrderReady({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/tailor-queue'] });
        toast({ title: 'تم تحديد الطلب كجاهز!' });
      }
    }
  });

  const m = subOrder.measurements || {};
  const isReady = subOrder.status === 'ready';

  return (
    <div className={`bg-white rounded-2xl border ${isReady ? 'border-emerald-200 shadow-sm opacity-60' : 'border-border shadow-md'} overflow-hidden`}>
      <div className={`p-4 flex justify-between items-center border-b ${isReady ? 'bg-emerald-50/50' : 'bg-primary/5'}`}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">{subOrder.subOrderNumber}</span>
          <span className="font-bold text-primary">{subOrder.profileName}</span>
        </div>
        {isReady ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0"><CheckCircle className="w-4 h-4 ml-1"/> جاهز</Badge>
        ) : (
          <Button 
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
            onClick={() => mutation.mutate({ subOrderId: subOrder.id })}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تم الانتهاء ✓'}
          </Button>
        )}
      </div>
      
      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الكمية:</span>
            <span className="font-bold text-lg">{subOrder.quantity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">القماش:</span>
            <span className="font-bold">{subOrder.fabricSource === 'shop_fabric' ? 'قماش المحل' : 'قماش العميل'}</span>
          </div>
          {subOrder.fabricDescription && (
            <div className="bg-muted p-2 rounded-lg text-sm font-medium mt-2 border border-border/50">
              {subOrder.fabricDescription}
            </div>
          )}
        </div>

        {/* Measurements Matrix */}
        <div className="col-span-2">
          <div className="flex items-center gap-2 text-primary font-bold mb-3 text-sm border-b pb-2">
            <Ruler className="w-4 h-4" />
            جدول القياسات
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-sm mb-4">
            <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
              <div className="text-muted-foreground text-xs mb-1">الطول</div>
              <div className="font-display font-bold text-xl">{m.length || '-'}</div>
            </div>
            <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
              <div className="text-muted-foreground text-xs mb-1">الكتف</div>
              <div className="font-display font-bold text-xl">{m.shoulder || '-'}</div>
            </div>
            <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
              <div className="text-muted-foreground text-xs mb-1">الصدر</div>
              <div className="font-display font-bold text-xl">{m.chest || '-'}</div>
            </div>
            <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
              <div className="text-muted-foreground text-xs mb-1">الكم</div>
              <div className="font-display font-bold text-xl">{m.sleeve || '-'}</div>
            </div>
            <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
              <div className="text-muted-foreground text-xs mb-1">الياقة</div>
              <div className="font-display font-bold text-xl">{m.neck || '-'}</div>
            </div>
          </div>
          
          {(m.modelNotes || m.generalNotes) && (
            <div className="text-sm bg-accent/10 border border-accent/20 p-3 rounded-xl text-accent-foreground">
              {m.modelNotes && <div><span className="font-bold">الموديل:</span> {m.modelNotes}</div>}
              {m.generalNotes && <div className={m.modelNotes ? "mt-2" : ""}><span className="font-bold">ملاحظات:</span> {m.generalNotes}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
