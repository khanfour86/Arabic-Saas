import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, Scissors, Ruler, StickyNote, Search, X, Clock, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const STAGE_COLORS: Record<string, string> = {
  cutting: 'bg-blue-100 text-blue-700 border-blue-200',
  assembly: 'bg-purple-100 text-purple-700 border-purple-200',
  finishing: 'bg-amber-100 text-amber-700 border-amber-200',
  ironing: 'bg-orange-100 text-orange-700 border-orange-200',
};

function StageBadge({ stage, t }: { stage: string; t: (k: any) => string }) {
  const map: Record<string, string> = {
    cutting: t('stageCutting'),
    assembly: t('stageAssembly'),
    finishing: t('stageFinishing'),
    ironing: t('stageIroning'),
  };
  const cls = STAGE_COLORS[stage] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {map[stage] ?? stage}
    </span>
  );
}

export function TailorQueue() {
  const [tab, setTab] = useState<'current' | 'completed'>('current');
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">{t('tailorQueueTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('tailorQueueSubtitle')}</p>
      </div>

      <div className="flex p-1 bg-muted/50 rounded-2xl w-full">
        {[
          { id: 'current', label: t('tailorCurrentTab') },
          { id: 'completed', label: t('tailorCompletedTab') },
        ].map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id as any)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
              tab === tb.id ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'current' ? <CurrentOrdersTab t={t} /> : <CompletedOrdersTab t={t} />}
    </div>
  );
}

function CurrentOrdersTab({ t }: { t: (k: any) => string }) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/shop/tailor-queue'],
    queryFn: () => fetch('/api/shop/tailor-queue').then(r => r.json()),
  });

  const completeStageMutation = useMutation({
    mutationFn: (invoiceId: number) =>
      fetch(`/api/shop/invoices/${invoiceId}/complete-stage`, { method: 'POST' }).then(async r => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || 'خطأ');
        }
        return r.json();
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/tailor-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shop/tailor-completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shop/workflow'] });
      if (result.isReady) {
        toast({ title: t('tailorLastStageSuccess') });
      } else {
        toast({ title: t('tailorCompletedSuccess') });
      }
    },
    onError: (err: any) => {
      toast({ title: err.message || 'خطأ', variant: 'destructive' });
    },
  });

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const myRoles: string[] = data?.myRoles ?? [];
  const plan: string = data?.plan ?? 'premium';
  const allItems: any[] = data?.items ?? [];

  // If tailor has no roles assigned
  if (myRoles.length === 0) {
    return (
      <Card className="border-0 shadow-md rounded-2xl">
        <CardContent className="p-12 flex flex-col items-center text-center text-muted-foreground gap-3">
          <AlertCircle className="w-14 h-14 text-amber-400" />
          <p className="text-lg font-bold text-foreground">{t('tailorNoRoles')}</p>
        </CardContent>
      </Card>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? allItems.filter((item: any) => item.invoiceNumber.toLowerCase().includes(q))
    : allItems;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="ps-10 pe-10 rounded-xl h-11 bg-card"
          placeholder={t('tailorSearchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-12 flex flex-col items-center text-center text-muted-foreground gap-3">
            <Scissors className="w-14 h-14 opacity-20" />
            <p className="text-lg font-bold text-foreground">{t('tailorNoCurrentOrders')}</p>
            <p className="text-sm">{t('tailorNoCurrentDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((item: any) => (
            <CurrentInvoiceCard
              key={item.invoiceId}
              item={item}
              plan={plan}
              onComplete={() => completeStageMutation.mutate(item.invoiceId)}
              isCompleting={completeStageMutation.isPending && completeStageMutation.variables === item.invoiceId}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CurrentInvoiceCard({ item, plan, onComplete, isCompleting, t }: {
  item: any;
  plan: string;
  onComplete: () => void;
  isCompleting: boolean;
  t: (k: any) => string;
}) {
  const [showMeasurements, setShowMeasurements] = useState(false);

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
      <div className={`h-1.5 w-full ${
        item.currentStage === 'cutting' ? 'bg-blue-400' :
        item.currentStage === 'assembly' ? 'bg-purple-400' :
        item.currentStage === 'finishing' ? 'bg-amber-400' :
        item.currentStage === 'ironing' ? 'bg-orange-400' : 'bg-primary'
      }`} />
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-lg text-primary">#{item.invoiceNumber}</span>
              {item.currentStage && <StageBadge stage={item.currentStage} t={t} />}
            </div>
            <div className="font-bold text-base">{item.customerName}</div>
            <div className="text-sm text-muted-foreground" dir="ltr">{item.customerPhone}</div>
          </div>
          <Button
            className="h-12 px-6 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transition-all shrink-0"
            onClick={onComplete}
            disabled={isCompleting}
          >
            {isCompleting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('tailorCompleteBtn')}
          </Button>
        </div>

        {/* Plan-aware details */}
        {plan === 'light' ? (
          <LightInvoiceDetails item={item} t={t} />
        ) : (
          <PremiumInvoiceDetails item={item} showMeasurements={showMeasurements} onToggleMeasurements={() => setShowMeasurements(!showMeasurements)} t={t} />
        )}
      </CardContent>
    </Card>
  );
}

function LightInvoiceDetails({ item, t }: { item: any; t: (k: any) => string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {item.bookNumber && (
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">{t('bookNumberLabel')}</div>
          <div className="font-bold">{item.bookNumber}</div>
        </div>
      )}
      {item.pageNumber && (
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">{t('pageNumberLabel')}</div>
          <div className="font-bold">{item.pageNumber}</div>
        </div>
      )}
      <div className="bg-primary/10 rounded-xl p-3 text-center">
        <div className="text-xs text-muted-foreground mb-1">{t('qtyLabel')}</div>
        <div className="font-bold text-primary">{item.quantity}</div>
      </div>
      <div className="bg-muted/50 rounded-xl p-3 text-center">
        <div className="text-xs text-muted-foreground mb-1">{t('colTotal')}</div>
        <div className="font-bold">{Number(item.price ?? 0).toFixed(3)}</div>
      </div>
    </div>
  );
}

function PremiumInvoiceDetails({ item, showMeasurements, onToggleMeasurements, t }: {
  item: any;
  showMeasurements: boolean;
  onToggleMeasurements: () => void;
  t: (k: any) => string;
}) {
  const subOrders: any[] = item.subOrders ?? [];

  return (
    <div className="space-y-3">
      {subOrders.map((so: any) => (
        <div key={so.id} className="border border-border rounded-xl p-4 space-y-3 bg-card">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-primary">{so.profileName}</span>
            {so.isProof && (
              <span className="text-xs bg-orange-500/20 text-orange-700 px-1.5 py-0.5 rounded-full font-medium border border-orange-200">
                تجربه
              </span>
            )}
            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium text-sm">
              {t('qtyLabel')} {so.quantity}
            </span>
            {so.fabricDescription && (
              <span className="bg-muted px-2.5 py-1 rounded-full text-muted-foreground text-sm">
                {so.fabricDescription}
              </span>
            )}
          </div>

          {so.measurements && (
            <div>
              <button
                onClick={onToggleMeasurements}
                className="flex items-center gap-2 text-sm font-bold text-primary hover:text-accent transition-colors"
              >
                <Ruler className="w-4 h-4" />
                {t('measurementsTable')} {showMeasurements ? '▲' : '▼'}
              </button>

              {showMeasurements && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                    {[
                      { label: t('mLength'), value: so.measurements.length },
                      { label: t('mShoulder'), value: so.measurements.shoulder },
                      { label: t('mChest'), value: so.measurements.chest },
                      { label: t('mSleeve'), value: so.measurements.sleeve },
                      { label: t('mNeck'), value: so.measurements.neck },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted p-3 rounded-xl flex flex-col items-center gap-1">
                        <div className="text-muted-foreground text-xs font-medium">{label}</div>
                        <div className="font-bold text-primary text-lg leading-none">{value ?? '-'}</div>
                      </div>
                    ))}
                  </div>

                  {so.measurements.modelNotes && (
                    <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex gap-2 items-start">
                      <Scissors className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-accent-foreground mb-0.5">{t('modelLabel')}</div>
                        <p className="text-sm whitespace-pre-wrap">{so.measurements.modelNotes}</p>
                      </div>
                    </div>
                  )}

                  {so.measurements.generalNotes && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 rounded-xl p-3 flex gap-2 items-start">
                      <StickyNote className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-blue-600 mb-0.5">{t('notesLabel')}</div>
                        <p className="text-sm whitespace-pre-wrap">{so.measurements.generalNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {so.notes && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
              {so.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CompletedOrdersTab({ t }: { t: (k: any) => string }) {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/shop/tailor-completed'],
    queryFn: () => fetch('/api/shop/tailor-completed').then(r => r.json()),
  });

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const allItems: any[] = data?.items ?? [];
  const plan: string = data?.plan ?? 'premium';

  const q = search.trim().toLowerCase();
  const filtered = q
    ? allItems.filter((item: any) => item.invoiceNumber.toLowerCase().includes(q))
    : allItems;

  const stageLabel = (stage: string) => {
    const map: Record<string, string> = {
      cutting: t('stageCutting'),
      assembly: t('stageAssembly'),
      finishing: t('stageFinishing'),
      ironing: t('stageIroning'),
    };
    return map[stage] ?? stage;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="ps-10 pe-10 rounded-xl h-11 bg-card"
          placeholder={t('tailorSearchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-12 flex flex-col items-center text-center text-muted-foreground gap-3">
            <Clock className="w-14 h-14 opacity-20" />
            <p className="text-lg font-bold text-foreground">{t('tailorNoCompletedOrders')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item: any) => (
            <Card key={item.historyId} className="border-0 shadow-sm rounded-2xl opacity-80 hover:opacity-100 transition-opacity">
              <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-primary">#{item.invoiceNumber}</span>
                    {item.bookNumber && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {t('lightBookRef')} {item.bookNumber}
                      </span>
                    )}
                  </div>
                  <div className="font-bold">{item.customerName}</div>
                  <div className="text-sm text-muted-foreground" dir="ltr">{item.customerPhone}</div>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-xs text-muted-foreground">{t('tailorStageLabel')}</span>
                    <StageBadge stage={item.stage} t={t} />
                    {item.nextStage ? (
                      <span className="text-xs text-muted-foreground">← {stageLabel(item.nextStage)}</span>
                    ) : (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        {t('stageReady')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {t('tailorCompletedAt')} {format(new Date(item.completedAt), 'yyyy/MM/dd HH:mm')}
                  </div>
                </div>
                <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
