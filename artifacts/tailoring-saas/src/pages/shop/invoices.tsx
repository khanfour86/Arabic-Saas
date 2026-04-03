import React, { useState } from 'react';
import { toEnglishDigits } from '@/lib/digits';
import { useListInvoices, useGetInvoice, useGetWhatsappMessage, ListInvoicesStatus } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, FileText, CheckCircle, MessageCircle, ChevronLeft, ChevronRight, Calendar, Scissors, Plus, History, ArrowRight, UserCircle2, X, Minus, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';

export function InvoicesList() {
  const searchString = useSearch();
  const urlStatus = new URLSearchParams(searchString).get('status') as ListInvoicesStatus | null;
  const [statusFilter, setStatusFilter] = useState<ListInvoicesStatus | 'all'>(urlStatus || 'all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { t, dir } = useTranslation();

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const isNumeric = debouncedSearch.length > 0 && /^\d+$/.test(debouncedSearch);
  const invoiceParams = (() => {
    const p: Record<string, string> = {};
    if (statusFilter !== 'all') p.status = statusFilter;
    if (isNumeric) {
      p.phone = debouncedSearch;
      p.invoiceNumber = debouncedSearch;
    }
    return Object.keys(p).length > 0 ? p : undefined;
  })();

  const { data, isLoading } = useListInvoices(invoiceParams as any);

  const ChevronNav = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">{t('invoicesTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('invoicesSubtitle')}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            className="h-14 pl-4 pr-12 rounded-2xl bg-white shadow-sm border-0 focus-visible:ring-primary"
            placeholder={t('searchInvoices')}
            value={search}
            onChange={(e) => setSearch(toEnglishDigits(e.target.value))}
          />
        </div>
        <div className="flex p-1 bg-muted/50 rounded-2xl overflow-x-auto shrink-0">
          {[
            { id: 'all', label: t('filterAll') },
            { id: 'under_tailoring', label: t('underTailoring') },
            { id: 'ready', label: t('statusReady') },
            { id: 'delivered', label: t('statusDelivered') }
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
              <Card className={`hover-elevate cursor-pointer shadow-md hover:shadow-xl transition-all rounded-2xl overflow-hidden group ${inv.customerIsVip ? 'border-2 border-red-500 shadow-red-200' : 'border-0'}`}>
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
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-bold text-xl font-display">#{inv.invoiceNumber}</h3>
                        {inv.customerIsVip && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">⭐ VIP</span>
                        )}
                        <Badge variant="outline" className={`border-0 ${
                          inv.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                          inv.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                          'bg-accent/20 text-accent-foreground'
                        }`}>
                          {inv.status === 'ready' ? t('statusReadyDelivery') : inv.status === 'delivered' ? t('statusDeliveredFull') : t('underTailoring')}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{inv.customerName} - <span dir="ltr">{inv.customerPhone}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-0 pt-4 md:pt-0 border-border">
                    <div className="text-center md:text-left">
                      <div className="text-xs text-muted-foreground mb-1">{t('colTotal')}</div>
                      <div className="font-bold text-lg text-primary">{inv.totalAmount} {t('kwd')}</div>
                    </div>
                    <div className="text-center md:text-left">
                      <div className="text-xs text-muted-foreground mb-1">{t('colRemaining')}</div>
                      <div className={`font-bold text-lg ${inv.remainingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {inv.remainingAmount} {t('kwd')}
                      </div>
                    </div>
                    <ChevronNav className="text-muted-foreground group-hover:text-primary transition-colors hidden md:block" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {data?.invoices.length === 0 && (
            <div className="text-center p-12 bg-white rounded-2xl shadow-sm text-muted-foreground">
              {t('noInvoices')}
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
  const { t, dir } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showDeliverDialog, setShowDeliverDialog] = useState(false);
  const [deliverQtyInput, setDeliverQtyInput] = useState('');

  const canEdit = user?.role === 'shop_manager' || user?.role === 'reception';

  const { data: history } = useQuery<any[]>({
    queryKey: [`/api/shop/invoices/${invoiceId}/history`],
    queryFn: () => fetch(`/api/shop/invoices/${invoiceId}/history`).then(r => r.ok ? r.json() : []),
    enabled: !!invoiceId,
  });

  const { data: stageHistory } = useQuery<any[]>({
    queryKey: [`/api/shop/invoices/${invoiceId}/stage-history`],
    queryFn: () => fetch(`/api/shop/invoices/${invoiceId}/stage-history`).then(r => r.ok ? r.json() : []),
    enabled: !!invoiceId,
  });

  const deliverMutation = useMutation({
    mutationFn: ({ qty }: { qty: number }) =>
      fetch(`/api/shop/invoices/${invoiceId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty }),
      }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'خطأ'); }
        return r.json();
      }),
    onSuccess: (result) => {
      setShowDeliverDialog(false);
      setDeliverQtyInput('');
      queryClient.invalidateQueries({ queryKey: [`/api/shop/invoices/${invoiceId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/shop/invoices/${invoiceId}/stage-history`] });
      queryClient.invalidateQueries({ queryKey: ['/api/shop/workflow'] });
      if (result.isFullyDelivered) {
        toast({ title: t('fullDeliverySuccess') });
      } else {
        toast({ title: t('partialDeliverySuccess').replace('{qty}', String(result.deliveredQty ?? '')) });
      }
    },
    onError: (err: any) => {
      setShowDeliverDialog(false);
      toast({ title: err.message || 'خطأ', variant: 'destructive' });
    },
  });

  const { refetch: getWhatsapp } = useGetWhatsappMessage(invoiceId, { query: { enabled: false } });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!inv) return <div>{t('noInvoiceFound')}</div>;

  const handleWhatsapp = async () => {
    const win = window.open('', '_blank');
    const res = await getWhatsapp();
    if (res.data && win) {
      const phone = res.data.phone || inv.customerPhone;
      const cleanPhone = '965' + phone.replace(/\D/g, '').replace(/^965/, '');
      win.location.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(res.data.message)}`;
    } else {
      win?.close();
      toast({ title: t('whatsappError'), description: t('whatsappErrorDesc'), variant: 'destructive' });
    }
  };

  const ChevronNav = dir === 'rtl' ? ChevronLeft : ChevronRight;

  // Qty tracking
  const totalQty: number = (inv as any).totalQty ?? inv.subOrders.reduce((s: number, so: any) => s + (so.quantity ?? 1), 0);
  const readyQty: number = (inv as any).readyQty ?? 0;
  const deliveredQty: number = (inv as any).deliveredQty ?? 0;
  const inProgressQty: number = (inv as any).inProgressQty ?? Math.max(0, totalQty - readyQty - deliveredQty);
  const hasPartialQty = readyQty > 0 || deliveredQty > 0;

  // Deliver dialog qty
  const deliverQtyInt = parseInt(toEnglishDigits(deliverQtyInput), 10) || 0;
  const isDeliverQtyValid = deliverQtyInt > 0 && deliverQtyInt <= readyQty;
  const isPartialDeliver = deliverQtyInt < readyQty;

  const openDeliverDialog = () => {
    setDeliverQtyInput(String(readyQty));
    setShowDeliverDialog(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/shop/invoices" className="inline-flex items-center text-muted-foreground hover:text-primary mb-2 gap-1">
        <ChevronNav className="w-4 h-4" /> {t('backToInvoices')}
      </Link>

      <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-full h-32 bg-primary z-0" />
        <CardContent className="p-0 relative z-10">
          <div className="p-8 text-primary-foreground flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="text-primary-foreground/70 text-sm mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(inv.createdAt), 'yyyy/MM/dd HH:mm')}
              </div>
              <h1 className="text-4xl font-display font-bold mb-2">{t('invoiceNum')}{inv.invoiceNumber}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`border-0 px-3 py-1 text-sm ${
                  inv.status === 'ready' ? 'bg-emerald-400 text-emerald-950' :
                  inv.status === 'delivered' ? 'bg-blue-400 text-blue-950' :
                  'bg-white text-primary'
                }`}>
                  {inv.status === 'ready' ? t('statusReadyDelivery') : inv.status === 'delivered' ? t('statusDeliveredFull') : t('underTailoring')}
                </Badge>
                {inv.status === 'under_tailoring' && inv.currentStage && (() => {
                  const stageMap: Record<string, string> = {
                    cutting: t('stageCutting'),
                    assembly: t('stageAssembly'),
                    finishing: t('stageFinishing'),
                    ironing: t('stageIroning'),
                  };
                  const stageBgMap: Record<string, string> = {
                    cutting: 'bg-blue-200/80 text-blue-900',
                    assembly: 'bg-purple-200/80 text-purple-900',
                    finishing: 'bg-amber-200/80 text-amber-900',
                    ironing: 'bg-orange-200/80 text-orange-900',
                  };
                  return (
                    <Badge className={`border-0 px-3 py-1 text-sm font-bold ${stageBgMap[inv.currentStage] ?? 'bg-white/30 text-primary'}`}>
                      {stageMap[inv.currentStage] ?? inv.currentStage}
                    </Badge>
                  );
                })()}
                {inv.status === 'ready' && inv.allSubOrdersReady && (
                  <Badge className="bg-accent text-accent-foreground border-0">{t('allReady')}</Badge>
                )}
                {readyQty > 0 && inv.status !== 'delivered' && (
                  <Badge className="bg-emerald-400/90 text-emerald-950 border-0 font-bold">
                    {readyQty} {t('qtyReady')}
                  </Badge>
                )}
              </div>
            </div>
            <div className="bg-white text-foreground p-4 rounded-2xl shadow-lg min-w-[250px]">
              <div className="flex justify-between items-center mb-2 pb-2 border-b">
                <span className="text-muted-foreground text-sm">{t('invoiceCustomer')}</span>
                <Link href={`/shop/customers/${inv.customerId}`} className="font-bold hover:text-primary">{inv.customerName}</Link>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">{t('invoicePhone')}</span>
                <span className="font-bold" dir="ltr">{inv.customerPhone}</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-background space-y-8">
            {/* Qty Tracking Section */}
            {(hasPartialQty || totalQty > 1) && (
              <div className="bg-muted/40 rounded-2xl p-5 border border-border/50 space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-base text-primary">{t('qtyBreakdownTitle')}</h3>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
                    {deliveredQty > 0 && (
                      <div className="h-full bg-blue-400 transition-all" style={{ width: `${(deliveredQty / totalQty) * 100}%` }} />
                    )}
                    {readyQty > 0 && (
                      <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(readyQty / totalQty) * 100}%` }} />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {deliveredQty} / {totalQty} {t('qtyProgressBar')}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center border border-border/50 shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">{t('qtyTotal')}</div>
                    <div className="text-2xl font-display font-bold text-primary">{totalQty}</div>
                  </div>
                  <div className={`rounded-xl p-3 text-center border shadow-sm ${inProgressQty > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-border/50'}`}>
                    <div className="text-xs text-muted-foreground mb-1">{t('qtyInProgress')}</div>
                    <div className={`text-2xl font-display font-bold ${inProgressQty > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>{inProgressQty}</div>
                  </div>
                  <div className={`rounded-xl p-3 text-center border shadow-sm ${readyQty > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-border/50'}`}>
                    <div className="text-xs text-muted-foreground mb-1">{t('qtyReady')}</div>
                    <div className={`text-2xl font-display font-bold ${readyQty > 0 ? 'text-emerald-700' : 'text-muted-foreground'}`}>{readyQty}</div>
                  </div>
                  <div className={`rounded-xl p-3 text-center border shadow-sm ${deliveredQty > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-border/50'}`}>
                    <div className="text-xs text-muted-foreground mb-1">{t('qtyDelivered')}</div>
                    <div className={`text-2xl font-display font-bold ${deliveredQty > 0 ? 'text-blue-700' : 'text-muted-foreground'}`}>{deliveredQty}</div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-display font-bold text-xl mb-4 text-primary">{t('orderDetails')} ({inv.subOrders.length})</h3>
              <div className="space-y-4">
                {inv.subOrders.map((sub: any) => (
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
                          <span className="bg-muted px-2 py-1 rounded-md">{t('qty')} {sub.quantity}</span>
                          <span className="bg-muted px-2 py-1 rounded-md">{sub.fabricSource === 'shop_fabric' ? t('shopFabric') : t('customerFabric')}</span>
                          {sub.fabricDescription && <span>{sub.fabricDescription}</span>}
                          {inv.bookNumber && (
                            <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-md font-medium">
                              {t('lightBookRef')} {inv.bookNumber}
                              {inv.pageNumber ? ` / ${t('lightPageRef')} ${inv.pageNumber}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center text-left min-w-[100px] border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-xs text-muted-foreground">{t('orderValue')}</div>
                      <div className="font-bold text-lg">{sub.price} {t('kwd')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex gap-8 w-full md:w-auto justify-around">
                <div className="text-center">
                  <div className="text-muted-foreground text-sm mb-1">{t('colTotal')}</div>
                  <div className="text-2xl font-bold">{inv.totalAmount} {t('kwd')}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-sm mb-1">{t('colPaid')}</div>
                  <div className="text-2xl font-bold text-emerald-600">{inv.paidAmount} {t('kwd')}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-sm mb-1">{t('colRemaining')}</div>
                  <div className={`text-2xl font-bold ${inv.remainingAmount > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{inv.remainingAmount} {t('kwd')}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                {canEdit && inv.status !== 'delivered' && (
                  <Button
                    variant="outline"
                    className="rounded-xl h-14 flex-1 md:flex-none border-primary/30 text-primary hover:bg-primary/5 font-bold gap-2"
                    onClick={() => setLocation(`/shop/invoices/${invoiceId}/edit`)}
                  >
                    <Plus className="w-5 h-5" /> {t('addEditOrders')}
                  </Button>
                )}
                {/* Show deliver button when readyQty > 0 OR status === ready */}
                {(readyQty > 0 || inv.status === 'ready') && inv.status !== 'delivered' && canEdit && (
                  <>
                    <Button
                      variant="outline"
                      className="rounded-xl h-14 flex-1 md:flex-none border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                      onClick={handleWhatsapp}
                    >
                      <MessageCircle className="w-5 h-5 ms-2" /> {t('whatsapp')}
                    </Button>
                    <Button
                      className="rounded-xl h-14 flex-1 md:flex-none bg-primary text-white hover:bg-primary/90 shadow-lg font-bold gap-2"
                      onClick={openDeliverDialog}
                    >
                      <CheckCircle className="w-5 h-5" /> {t('deliverToCustomer')} {readyQty > 0 && `(${readyQty})`}
                    </Button>
                  </>
                )}
                {inv.status === 'delivered' && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-base py-2 px-6 rounded-xl">
                    {t('deliveredBadge')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage History Section */}
      {Array.isArray(stageHistory) && stageHistory.length > 0 && (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-lg text-primary">{t('stageHistoryTitle')}</h3>
              <Badge variant="outline" className="text-xs">{stageHistory.length}</Badge>
            </div>
            <div className="space-y-3">
              {stageHistory.map((sh: any, i: number) => {
                const stageMap: Record<string, string> = {
                  cutting: t('stageCutting'), assembly: t('stageAssembly'),
                  finishing: t('stageFinishing'), ironing: t('stageIroning'),
                };
                const stageBgMap: Record<string, string> = {
                  cutting: 'bg-blue-100 text-blue-700 border-blue-200',
                  assembly: 'bg-purple-100 text-purple-700 border-purple-200',
                  finishing: 'bg-amber-100 text-amber-700 border-amber-200',
                  ironing: 'bg-orange-100 text-orange-700 border-orange-200',
                };
                return (
                  <div key={sh.id ?? i} className="flex items-start gap-3 bg-muted/30 rounded-xl p-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${stageBgMap[sh.stage] ?? 'bg-muted text-muted-foreground border-border'}`}>
                          {stageMap[sh.stage] ?? sh.stage}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        {sh.nextStage ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${stageBgMap[sh.nextStage] ?? 'bg-muted text-muted-foreground border-border'}`}>
                            {stageMap[sh.nextStage] ?? sh.nextStage}
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                            {t('stageReady')}
                          </span>
                        )}
                        {sh.qty && sh.qty > 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                            {sh.qty} {t('pieces')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {sh.tailorName && (
                          <span className="flex items-center gap-1">
                            <UserCircle2 className="w-3 h-3" /> {sh.tailorName}
                          </span>
                        )}
                        {sh.completedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {format(new Date(sh.completedAt), 'yyyy/MM/dd HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice History Section */}
      <InvoiceHistorySection history={history ?? []} t={t} dir={dir} />

      {/* Partial Delivery Dialog */}
      <Dialog open={showDeliverDialog} onOpenChange={open => { if (!open && !deliverMutation.isPending) { setShowDeliverDialog(false); setDeliverQtyInput(''); } }}>
        <DialogContent dir={dir} className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-right">{t('partialDeliveryTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">{t('readyForDeliveryQty')}</div>
              <div className="text-3xl font-display font-bold text-emerald-700">{readyQty}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('pieces')}</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold block text-center">{t('partialDeliveryDesc')}</label>
              <div className="flex items-center gap-3">
                <button
                  className="w-12 h-12 rounded-xl bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
                  onClick={() => setDeliverQtyInput(String(Math.max(1, (parseInt(toEnglishDigits(deliverQtyInput)) || 1) - 1)))}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={deliverQtyInput}
                  onChange={e => setDeliverQtyInput(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                  className={`flex-1 h-14 text-center text-2xl font-bold rounded-xl ${!isDeliverQtyValid && deliverQtyInput !== '' ? 'border-red-400' : 'border-primary/30'}`}
                />
                <button
                  className="w-12 h-12 rounded-xl bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
                  onClick={() => setDeliverQtyInput(String(Math.min(readyQty, (parseInt(toEnglishDigits(deliverQtyInput)) || 0) + 1)))}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick select */}
            <div className="flex gap-2 flex-wrap justify-center">
              {[1, Math.ceil(readyQty / 2), readyQty].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(v => (
                <button
                  key={v}
                  onClick={() => setDeliverQtyInput(String(v))}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
                    deliverQtyInt === v ? 'bg-primary text-white border-primary' : 'bg-muted border-transparent hover:border-primary/30'
                  }`}
                >
                  {v === readyQty ? `${t('allPieces')} (${v})` : v}
                </button>
              ))}
            </div>

            {isDeliverQtyValid && isPartialDeliver && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-center text-amber-800 font-medium">
                {readyQty - deliverQtyInt} {t('pieces')} {t('qtyReady')}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <Button
              className={`flex-1 font-bold rounded-xl h-12 ${isPartialDeliver ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-primary hover:bg-primary/90 text-white'}`}
              disabled={deliverMutation.isPending || !isDeliverQtyValid}
              onClick={() => deliverMutation.mutate({ qty: deliverQtyInt })}
            >
              {deliverMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `${t('deliverPiecesBtn')} ${isDeliverQtyValid ? deliverQtyInt : ''} ${t('pieces')}`}
            </Button>
            <Button variant="outline" className="rounded-xl h-12" disabled={deliverMutation.isPending} onClick={() => { setShowDeliverDialog(false); setDeliverQtyInput(''); }}>
              {t('tailorConfirmCancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoiceHistorySection({ history, t, dir }: { history: any[]; t: Function; dir: string }) {
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const fieldLabel = (field: string): string => {
    const map: Record<string, string> = {
      price: t('historyFieldPrice'),
      paidAmount: t('historyFieldPaid'),
      quantity: t('historyFieldQty'),
      fabricSource: t('historyFieldFabricSource'),
      fabricDescription: t('historyFieldFabricDesc'),
    };
    return map[field] ?? field;
  };

  const fabricLabel = (val: string): string =>
    val === 'shop_fabric' ? t('shopFabricShort') : val === 'customer_fabric' ? t('customerFabricShort') : val;

  const formatVal = (field: string, val: any): string => {
    if (field === 'fabricSource') return fabricLabel(String(val));
    if (['price', 'paidAmount'].includes(field)) return `${parseFloat(String(val || 0)).toFixed(3)} ${t('kwd')}`;
    return String(val ?? '—');
  };

  const fmtKwd = (val: number) => `${val.toFixed(3)} ${t('kwd')}`;

  if (!Array.isArray(history) || history.length === 0) return null;

  const dialogChanges = selectedEntry ? (selectedEntry.changes ?? []).filter((c: any) => c.type !== 'summary') : [];
  const dialogSummary = selectedEntry ? (selectedEntry.changes ?? []).find((c: any) => c.type === 'summary') : null;
  const dialogDate = selectedEntry ? new Date(selectedEntry.changedAt) : null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-lg text-primary">{t('invoiceHistory')}</h3>
        <Badge variant="outline" className="text-xs">{history.length}</Badge>
      </div>

      <div className="relative">
        <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-4">
          {history.map((entry: any) => {
            const changes: any[] = (entry.changes ?? []).filter((c: any) => c.type !== 'summary');
            const summary = (entry.changes ?? []).find((c: any) => c.type === 'summary');
            const date = new Date(entry.changedAt);
            const updatedCount = changes.filter((c: any) => c.type === 'updated').length;
            const addedCount = changes.filter((c: any) => c.type === 'added').length;
            return (
              <div key={entry.id} className="relative pr-10">
                <div className="absolute right-1 top-3 w-6 h-6 bg-primary/10 border-2 border-primary/30 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                </div>

                <Card
                  className="border-0 shadow-sm rounded-2xl bg-white cursor-pointer active:scale-[0.99] transition-transform hover:shadow-md"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground">{format(date, 'yyyy/MM/dd')}</span>
                        <span className="text-xs text-muted-foreground">{format(date, 'HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.changedByUsername && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserCircle2 className="w-3.5 h-3.5" />
                            <span>{t('changedBy')}: <span className="font-bold text-foreground">{entry.changedByUsername}</span></span>
                          </div>
                        )}
                        <span className="text-xs text-primary font-medium underline underline-offset-2">{t('historyClickDetails')}</span>
                      </div>
                    </div>

                    {/* Summary chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {updatedCount > 0 && (
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                          {updatedCount} {dir === 'rtl' ? 'تعديل' : 'edit(s)'}
                        </span>
                      )}
                      {addedCount > 0 && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                          + {addedCount} {dir === 'rtl' ? 'طلب جديد' : 'new order(s)'}
                        </span>
                      )}
                      {summary && Math.abs(summary.newTotal - summary.oldTotal) > 0.0001 && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${summary.newTotal > summary.oldTotal ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {fmtKwd(summary.oldTotal)} ← {fmtKwd(summary.newTotal)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={open => !open && setSelectedEntry(null)}>
        <DialogContent dir={dir} className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-primary" />
              {t('historyEntryDetails')}
              {dialogDate && (
                <span className="text-sm font-normal text-muted-foreground">
                  — {format(dialogDate, 'yyyy/MM/dd')} {format(dialogDate, 'HH:mm')}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-3 py-1">
              {/* Changed by */}
              {selectedEntry.changedByUsername && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UserCircle2 className="w-4 h-4" />
                  <span>{t('changedBy')}: <span className="font-bold text-foreground">{selectedEntry.changedByUsername}</span></span>
                </div>
              )}

              {/* All changes */}
              <div className="space-y-2">
                {dialogChanges.map((ch: any, ci: number) => (
                  <div key={ci} className={`rounded-xl p-3 text-sm ${ch.type === 'added' ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted/50 border border-border/50'}`}>
                    {ch.type === 'added' ? (
                      <div className="flex items-start gap-2">
                        <Plus className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-700">{t('historyAdded')}</span>
                          <span className="text-muted-foreground mx-1">—</span>
                          <span className="font-bold">{ch.profileName}</span>
                          <div className="flex gap-3 flex-wrap mt-1.5">
                            <span className="text-xs bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg font-medium">{t('qty')} {ch.quantity}</span>
                            <span className="text-xs bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg font-medium">{formatVal('price', ch.price)}</span>
                            <span className="text-xs bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg font-medium">{fabricLabel(ch.fabricSource)}</span>
                            {ch.paidAmount > 0 && (
                              <span className="text-xs bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg font-medium">{t('historyFieldPaid')} {formatVal('paidAmount', ch.paidAmount)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-primary">{ch.profileName}</span>
                            <span className="text-xs text-muted-foreground">({ch.subOrderNumber})</span>
                            <span className="text-muted-foreground">—</span>
                            <span className="font-medium">{fieldLabel(ch.field)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg text-sm font-bold line-through">
                              {formatVal(ch.field, ch.oldValue)}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-sm font-bold">
                              {formatVal(ch.field, ch.newValue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals summary */}
              {dialogSummary && (
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-primary">{t('total')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <div className="text-xs text-red-500 mb-1">{t('summaryOldTotal')}</div>
                      <div className="font-bold text-red-700 text-base line-through">{fmtKwd(dialogSummary.oldTotal)}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <div className="text-xs text-emerald-600 mb-1">{t('summaryNewTotal')}</div>
                      <div className="font-bold text-emerald-700 text-base">{fmtKwd(dialogSummary.newTotal)}</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <div className="text-xs text-red-500 mb-1">{t('summaryOldPaid')}</div>
                      <div className="font-bold text-red-700 text-sm line-through">{fmtKwd(dialogSummary.oldPaid)}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <div className="text-xs text-emerald-600 mb-1">{t('summaryNewPaid')}</div>
                      <div className="font-bold text-emerald-700 text-sm">{fmtKwd(dialogSummary.newPaid)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setSelectedEntry(null)}>
              <X className="w-4 h-4 me-2" />
              {t('closeDialog')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
