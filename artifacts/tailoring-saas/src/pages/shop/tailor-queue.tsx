import React, { useState } from 'react';
import { useGetTailorQueue, useMarkSubOrderReady } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Scissors, Ruler, StickyNote } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function TailorQueue() {
  const { data, isLoading } = useGetTailorQueue();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const markReadyMutation = useMarkSubOrderReady({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/tailor/queue'] });
        toast({ title: t('orderMarkedReady') });
      }
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const pending = data?.subOrders?.filter((s: any) => s.status !== 'ready') ?? [];
  const ready   = data?.subOrders?.filter((s: any) => s.status === 'ready') ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">{t('tailorQueueTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('tailorQueueSubtitle')}</p>
      </div>

      {pending.length === 0 && (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-12 flex flex-col items-center text-center text-muted-foreground gap-3">
            <CheckCircle className="w-16 h-16 text-emerald-400 animate-bounce" />
            <p className="text-xl font-bold">
              {ready.length > 0 ? t('allOrdersReady') : t('noWorkNow')}
            </p>
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {pending.map((sub: any) => (
            <SubOrderCard
              key={sub.id}
              sub={sub}
              onMarkReady={() => markReadyMutation.mutate({ subOrderId: sub.id })}
              isPending={markReadyMutation.isPending}
              t={t}
            />
          ))}
        </div>
      )}

      {ready.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-lg text-emerald-600 flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5" />
            {t('ready')} ({ready.length} {t('orders')})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {ready.map((sub: any) => (
              <Card key={sub.id} className="border-0 shadow-sm rounded-2xl opacity-60">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-bold">{sub.profileName} — {sub.customerName}</div>
                      <div className="text-sm text-muted-foreground" dir="ltr">{sub.customerPhone}</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">{t('ready')}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubOrderCard({ sub, onMarkReady, isPending, t }: { sub: any; onMarkReady: () => void; isPending: boolean; t: (k: any) => string }) {
  const [showMeasurements, setShowMeasurements] = useState(false);
  const m = sub.measurements;

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
      <div className="h-1.5 bg-accent w-full" />
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-display text-xl font-bold text-primary">{sub.profileName}</h3>
              <span className="text-muted-foreground">—</span>
              <span className="font-bold">{sub.customerName}</span>
              <span className="text-muted-foreground text-sm" dir="ltr">{sub.customerPhone}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap text-sm">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                {t('qtyLabel')} {sub.quantity}
              </span>
              <span className="bg-muted px-3 py-1 rounded-full text-muted-foreground">
                {t('fabricLabel')} {sub.fabricDescription || (sub.fabricSource === 'shop_fabric' ? 'قماش المحل' : 'قماش العميل')}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(sub.createdAt), 'yyyy/MM/dd')}
              </span>
            </div>

            {m && (
              <div>
                <button
                  onClick={() => setShowMeasurements(!showMeasurements)}
                  className="flex items-center gap-2 text-sm font-bold text-primary hover:text-accent transition-colors"
                >
                  <Ruler className="w-4 h-4" />
                  {t('measurementsTable')} {showMeasurements ? '▲' : '▼'}
                </button>

                {showMeasurements && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-5 gap-2 text-center text-sm">
                      {[
                        { label: t('mLength'), value: m.length },
                        { label: t('mShoulder'), value: m.shoulder },
                        { label: t('mChest'), value: m.chest },
                        { label: t('mSleeve'), value: m.sleeve },
                        { label: t('mNeck'), value: m.neck },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-muted p-2 rounded-lg">
                          <div className="text-muted-foreground text-xs mb-1">{label}</div>
                          <div className="font-bold text-primary">{value ?? '-'}</div>
                        </div>
                      ))}
                    </div>

                    {m.modelNotes && (
                      <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex gap-2 items-start">
                        <Scissors className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-accent-foreground mb-0.5">{t('modelLabel')}</div>
                          <p className="text-sm whitespace-pre-wrap">{m.modelNotes}</p>
                        </div>
                      </div>
                    )}

                    {m.generalNotes && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 items-start">
                        <StickyNote className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-blue-600 mb-0.5">{t('notesLabel')}</div>
                          <p className="text-sm whitespace-pre-wrap">{m.generalNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-3">
            <Button
              className="h-14 px-8 rounded-xl text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-1 transition-all"
              onClick={onMarkReady}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('doneBtn')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
