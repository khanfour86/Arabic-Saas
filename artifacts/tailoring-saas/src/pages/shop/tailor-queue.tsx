import React, { useState } from 'react';
import { useGetTailorQueue, useMarkSubOrderReady } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, Scissors, Ruler, StickyNote, Pin, PinOff, Search, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { toEnglishDigits } from '@/lib/digits';

const PINNED_KEY = 'tailor_pinned_invoices';

function getPinnedIds(): Set<number> {
  try {
    const stored = localStorage.getItem(PINNED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function savePinnedIds(ids: Set<number>) {
  localStorage.setItem(PINNED_KEY, JSON.stringify([...ids]));
}

export function TailorQueue() {
  const { data, isLoading } = useGetTailorQueue();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(getPinnedIds);
  const [search, setSearch] = useState('');

  const markReadyMutation = useMarkSubOrderReady({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/tailor-queue'] });
        toast({ title: t('orderMarkedReady') });
      }
    }
  });

  const togglePin = (invoiceId: number) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      savePinnedIds(next);
      return next;
    });
  };

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const allItems: any[] = data?.items ?? [];

  const q = search.trim().toLowerCase();
  const filtered = q
    ? allItems.filter((item: any) =>
        item.invoiceNumber.toLowerCase().includes(q) ||
        item.customerPhone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      )
    : allItems;

  const pendingItems = filtered.filter((item: any) =>
    item.subOrders.some((s: any) => s.status !== 'ready')
  );
  const readyItems = filtered.filter((item: any) =>
    item.subOrders.every((s: any) => s.status === 'ready')
  );

  const sortedPending = [...pendingItems].sort((a: any, b: any) => {
    const aPinned = pinnedIds.has(a.invoiceId);
    const bPinned = pinnedIds.has(b.invoiceId);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">{t('tailorQueueTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('tailorQueueSubtitle')}</p>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="ps-10 pe-10 rounded-xl h-11 bg-card"
          placeholder="ابحث برقم الفاتورة أو رقم الهاتف..."
          value={search}
          onChange={e => setSearch(toEnglishDigits(e.target.value))}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {q && pendingItems.length === 0 && readyItems.length === 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-10 flex flex-col items-center text-center text-muted-foreground gap-2">
            <Search className="w-10 h-10 opacity-30" />
            <p className="font-bold">لا توجد نتائج للبحث</p>
            <p className="text-sm">"{search}"</p>
          </CardContent>
        </Card>
      )}

      {!q && pendingItems.length === 0 && (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-12 flex flex-col items-center text-center text-muted-foreground gap-3">
            <CheckCircle className="w-16 h-16 text-emerald-400 animate-bounce" />
            <p className="text-xl font-bold">
              {readyItems.length > 0 ? t('allOrdersReady') : t('noWorkNow')}
            </p>
          </CardContent>
        </Card>
      )}

      {sortedPending.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {sortedPending.map((item: any) => (
            <InvoiceCard
              key={item.invoiceId}
              item={item}
              isPinned={pinnedIds.has(item.invoiceId)}
              onTogglePin={() => togglePin(item.invoiceId)}
              onMarkReady={(subOrderId: number) => markReadyMutation.mutate({ subOrderId })}
              isPending={markReadyMutation.isPending}
              t={t}
            />
          ))}
        </div>
      )}

      {readyItems.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-lg text-emerald-600 flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5" />
            {t('ready')} ({readyItems.length} {t('orders')})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {readyItems.map((item: any) => (
              <Card key={item.invoiceId} className="border-0 shadow-sm rounded-2xl opacity-60">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-bold">#{item.invoiceNumber} — {item.customerName}</div>
                      <div className="text-sm text-muted-foreground" dir="ltr">{item.customerPhone}</div>
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

function InvoiceCard({ item, isPinned, onTogglePin, onMarkReady, isPending, t }: {
  item: any;
  isPinned: boolean;
  onTogglePin: () => void;
  onMarkReady: (subOrderId: number) => void;
  isPending: boolean;
  t: (k: any) => string;
}) {
  const hasProof = item.subOrders.some((s: any) => s.isProof);
  const pendingSubOrders = item.subOrders.filter((s: any) => s.status !== 'ready');
  const readySubOrders = item.subOrders.filter((s: any) => s.status === 'ready');

  return (
    <Card className={`border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all ${isPinned ? 'ring-2 ring-primary/40' : ''}`}>
      <div className={`h-1.5 w-full ${isPinned ? 'bg-primary' : 'bg-accent'}`} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-lg text-primary">#{item.invoiceNumber}</span>
            <span className="font-bold text-base">{item.customerName}</span>
            <span className="text-sm text-muted-foreground" dir="ltr">{item.customerPhone}</span>
            <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
              {pendingSubOrders.length} {t('orders')}
            </span>
            {hasProof && (
              <span className="text-xs bg-orange-500/20 text-orange-700 px-2.5 py-0.5 rounded-full font-bold border border-orange-200">
                تجربه
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-xl shrink-0 transition-all ${isPinned ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:text-primary'}`}
            onClick={onTogglePin}
            title={isPinned ? 'إلغاء التثبيت' : 'تثبيت الفاتورة'}
          >
            {isPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
          </Button>
        </div>

        <div className="space-y-3">
          {pendingSubOrders.map((so: any) => (
            <SubOrderRow
              key={so.id}
              so={so}
              onMarkReady={() => onMarkReady(so.id)}
              isPending={isPending}
              t={t}
            />
          ))}
          {readySubOrders.map((so: any) => (
            <div key={so.id} className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl opacity-70">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium">{so.profileName}</span>
              {so.isProof && (
                <span className="text-xs bg-orange-500/20 text-orange-700 px-1.5 py-0.5 rounded-full">تجربه</span>
              )}
              <Badge className="ms-auto bg-emerald-100 text-emerald-700 border-0 text-xs">{t('ready')}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SubOrderRow({ so, onMarkReady, isPending, t }: {
  so: any;
  onMarkReady: () => void;
  isPending: boolean;
  t: (k: any) => string;
}) {
  const [showMeasurements, setShowMeasurements] = useState(false);
  const m = so.measurements;

  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-primary">{so.profileName}</span>
            {so.isProof && (
              <span className="text-xs bg-orange-500/20 text-orange-700 px-1.5 py-0.5 rounded-full font-medium border border-orange-200">
                تجربه
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
              {t('qtyLabel')} {so.quantity}
            </span>
            <span className="bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
              {t('fabricLabel')} {so.fabricDescription || (so.fabricSource === 'shop_fabric' ? 'قماش المحل' : 'قماش العميل')}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(so.createdAt), 'yyyy/MM/dd')}
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
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                    {[
                      { label: t('mLength'), value: m.length },
                      { label: t('mShoulder'), value: m.shoulder },
                      { label: t('mChest'), value: m.chest },
                      { label: t('mSleeve'), value: m.sleeve },
                      { label: t('mNeck'), value: m.neck },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted p-3 rounded-xl flex flex-col items-center gap-1">
                        <div className="text-muted-foreground text-xs font-medium">{label}</div>
                        <div className="font-bold text-primary text-lg leading-none">{value ?? '-'}</div>
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
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 rounded-xl p-3 flex gap-2 items-start">
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

        <Button
          className="h-12 px-5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-1 transition-all shrink-0"
          onClick={onMarkReady}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('doneBtn')}
        </Button>
      </div>
    </div>
  );
}
