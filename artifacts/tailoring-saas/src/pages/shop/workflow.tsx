import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, X, Scissors, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const STAGES = ['cutting', 'assembly', 'finishing', 'ironing', 'ready'] as const;

const STAGE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  cutting:  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
  assembly: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400' },
  finishing:{ bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
  ironing:  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
  ready:    { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-400' },
};

function StageBadge({ stage, t }: { stage: string | null; t: (k: any) => string }) {
  if (!stage) return <span className="text-xs text-muted-foreground">{t('stageNotStarted')}</span>;
  const map: Record<string, string> = {
    cutting: t('stageCutting'),
    assembly: t('stageAssembly'),
    finishing: t('stageFinishing'),
    ironing: t('stageIroning'),
    ready: t('stageReady'),
  };
  const s = STAGE_STYLES[stage] ?? STAGE_STYLES.cutting;
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      {map[stage] ?? stage}
    </span>
  );
}

export function WorkflowDashboard() {
  const { t } = useTranslation();
  const [activeStageFilter, setActiveStageFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const params = new URLSearchParams();
  if (activeStageFilter !== 'all') params.set('stage', activeStageFilter);
  if (search.trim()) params.set('customerName', search.trim());

  const { data, isLoading } = useQuery({
    queryKey: ['/api/shop/workflow', activeStageFilter, search],
    queryFn: () => fetch(`/api/shop/workflow?${params}`).then(r => r.json()),
    staleTime: 10000,
  });

  const counts = data?.counts ?? {};
  const activeStages: string[] = data?.activeStages ?? [];
  const invoices: any[] = data?.invoices ?? [];

  const stageLabel = (stage: string) => {
    const map: Record<string, string> = {
      cutting: t('workflowCountCutting'),
      assembly: t('workflowCountAssembly'),
      finishing: t('workflowCountFinishing'),
      ironing: t('workflowCountIroning'),
      ready: t('workflowCountReady'),
    };
    return map[stage] ?? stage;
  };

  // Local filter on search (invoice number or phone or name)
  const q = search.trim().toLowerCase();
  const filtered = q
    ? invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.includes(q)
      )
    : invoices;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">{t('workflowTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('workflowSubtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* No tailors warning */}
          {activeStages.length === 0 && (
            <Card className="border-0 shadow-md rounded-2xl border-amber-200 bg-amber-50">
              <CardContent className="p-6 flex gap-3 items-start">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-medium">{t('workflowNoTailors')}</p>
              </CardContent>
            </Card>
          )}

          {/* Stage Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {STAGES.map(stage => {
              const s = STAGE_STYLES[stage];
              const count = counts[stage] ?? 0;
              const isActive = activeStageFilter === stage;
              return (
                <button
                  key={stage}
                  onClick={() => setActiveStageFilter(isActive ? 'all' : stage)}
                  className={`relative p-4 rounded-2xl border-2 transition-all text-start hover:shadow-md ${
                    isActive
                      ? `${s.bg} ${s.border} shadow-md`
                      : 'bg-card border-border hover:border-primary/30'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${s.dot} mb-2`} />
                  <div className={`text-3xl font-display font-bold ${isActive ? s.text : 'text-foreground'}`}>
                    {count}
                  </div>
                  <div className={`text-xs font-bold mt-1 ${isActive ? s.text : 'text-muted-foreground'}`}>
                    {stageLabel(stage)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="ps-10 pe-10 rounded-xl h-11 bg-card"
                placeholder={t('workflowSearchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {activeStageFilter !== 'all' && (
              <button
                onClick={() => setActiveStageFilter('all')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
              >
                <X className="w-4 h-4" />
                {t('workflowAllStages')}
              </button>
            )}
          </div>

          {/* Stage Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveStageFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeStageFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('workflowAllStages')}
            </button>
            {STAGES.map(stage => {
              const s = STAGE_STYLES[stage];
              const isActive = activeStageFilter === stage;
              return (
                <button
                  key={stage}
                  onClick={() => setActiveStageFilter(isActive ? 'all' : stage)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                    isActive ? `${s.bg} ${s.text} ${s.border}` : 'bg-muted/50 text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  {stageLabel(stage)} ({counts[stage] ?? 0})
                </button>
              );
            })}
          </div>

          {/* Invoices List */}
          {filtered.length === 0 ? (
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-12 flex flex-col items-center text-center text-muted-foreground gap-3">
                <Scissors className="w-14 h-14 opacity-20" />
                <p className="font-bold text-foreground">{t('workflowNoOrders')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filtered.map((inv: any) => (
                <WorkflowInvoiceRow key={inv.id} inv={inv} t={t} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WorkflowInvoiceRow({ inv, t }: { inv: any; t: (k: any) => string }) {
  const displayStage = inv.status === 'ready' ? 'ready' : inv.currentStage;

  return (
    <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Stage indicator */}
          <div className={`w-1 self-stretch rounded-full shrink-0 hidden sm:block ${
            STAGE_STYLES[displayStage ?? 'cutting']?.dot ?? 'bg-muted'
          }`} />

          {/* Info */}
          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-primary">#{inv.invoiceNumber}</span>
                {inv.bookNumber && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {t('lightBookRef')} {inv.bookNumber}
                    {inv.pageNumber ? ` / ${t('lightPageRef')} ${inv.pageNumber}` : ''}
                  </span>
                )}
              </div>
              <div className="font-bold text-sm">{inv.customerName}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">{inv.customerPhone}</div>
            </div>
            <div className="flex items-center gap-2">
              <StageBadge stage={displayStage} t={t} />
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              {inv.currentTailor && (
                <span className="text-xs text-muted-foreground">
                  {t('workflowEmployee')}: <span className="font-bold text-foreground">{inv.currentTailor}</span>
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {format(new Date(inv.createdAt), 'yyyy/MM/dd')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
