import React, { useState, useEffect } from 'react';
import { toEnglishDigits } from '@/lib/digits';
import { useListInvoices, useGetInvoice, useMarkInvoiceDelivered, useGetWhatsappMessage, useGetCustomer, ListInvoicesStatus } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, FileText, CheckCircle, MessageCircle, ChevronLeft, ChevronRight, Calendar, Scissors, Plus, X } from 'lucide-react';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
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

function AddEditOrdersDialog({ inv, open, onClose }: { inv: any; open: boolean; onClose: () => void }) {
  const { t, dir } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Editable copies of existing sub-orders
  const [editedOrders, setEditedOrders] = useState<Record<number, any>>({});
  // New sub-order form
  const emptyNew = { profileId: 0, quantity: 1, fabricSource: 'shop_fabric', fabricDescription: '', price: '', paidAmount: '', notes: '' };
  const [newOrder, setNewOrder] = useState(emptyNew);
  const [saving, setSaving] = useState(false);

  // Fetch customer profiles for the new order profile selector
  const { data: customer } = useGetCustomer(inv.customerId);

  // Initialize editable copies when dialog opens
  useEffect(() => {
    if (open && inv?.subOrders) {
      const map: Record<number, any> = {};
      inv.subOrders.forEach((so: any) => {
        map[so.id] = {
          quantity: so.quantity,
          fabricSource: so.fabricSource,
          fabricDescription: so.fabricDescription || '',
          price: String(so.price),
          paidAmount: String(so.paidAmount),
          notes: so.notes || '',
        };
      });
      setEditedOrders(map);
      setNewOrder(emptyNew);
    }
  }, [open, inv]);

  const setField = (soId: number, field: string, val: any) => {
    setEditedOrders(prev => ({ ...prev, [soId]: { ...prev[soId], [field]: val } }));
  };

  const hasNewOrder = newOrder.profileId > 0;

  const handleSave = async () => {
    if (hasNewOrder) {
      if (!newOrder.quantity || Number(newOrder.quantity) <= 0) {
        toast({ title: t('error'), description: t('mustEnterQtyNew'), variant: 'destructive' }); return;
      }
      if (!newOrder.price || Number(newOrder.price) <= 0) {
        toast({ title: t('error'), description: t('mustEnterPriceNew'), variant: 'destructive' }); return;
      }
    }

    setSaving(true);
    try {
      // PATCH each existing sub-order
      await Promise.all(
        inv.subOrders.map((so: any) => {
          const ed = editedOrders[so.id];
          if (!ed) return Promise.resolve();
          return fetch(`/api/shop/suborders/${so.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quantity: Number(ed.quantity),
              fabricSource: ed.fabricSource,
              fabricDescription: ed.fabricDescription || null,
              price: Number(ed.price),
              paidAmount: Number(ed.paidAmount),
              notes: ed.notes || null,
            }),
          });
        })
      );

      // POST new sub-order if filled
      if (hasNewOrder) {
        await fetch('/api/shop/suborders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: inv.id,
            profileId: Number(newOrder.profileId),
            quantity: Number(newOrder.quantity),
            fabricSource: newOrder.fabricSource,
            fabricDescription: newOrder.fabricDescription || null,
            price: Number(newOrder.price),
            paidAmount: Number(newOrder.paidAmount) || 0,
            notes: newOrder.notes || null,
          }),
        });
        toast({ title: t('subOrderAdded') });
      } else {
        toast({ title: t('ordersUpdated') });
      }

      queryClient.invalidateQueries({ queryKey: [`/api/shop/invoices/${inv.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/shop/invoices'] });
      onClose();
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const mainProfiles = customer?.profiles?.filter((p: any) => !p.isProof) ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir={dir} className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> {t('addEditOrders')} — #{inv.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Existing sub-orders */}
          {inv.subOrders?.length > 0 && (
            <div>
              <h3 className="font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wide">{t('currentOrders')}</h3>
              <div className="space-y-4">
                {inv.subOrders.map((so: any) => {
                  const ed = editedOrders[so.id] ?? {};
                  return (
                    <div key={so.id} className="border border-border rounded-2xl p-4 space-y-3 bg-muted/20">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-primary">{so.profileName}</span>
                        <span className="text-xs text-muted-foreground">({so.subOrderNumber})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{t('qty')}</label>
                          <Input
                            type="number" min={1}
                            value={ed.quantity ?? so.quantity}
                            onChange={e => setField(so.id, 'quantity', e.target.value)}
                            className="h-9 rounded-xl bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{t('fabricSource')}</label>
                          <Select value={ed.fabricSource ?? so.fabricSource} onValueChange={v => setField(so.id, 'fabricSource', v)}>
                            <SelectTrigger className="h-9 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-gray-900 text-white">
                              <SelectItem value="shop_fabric">{t('shopFabric')}</SelectItem>
                              <SelectItem value="customer_fabric">{t('customerFabric')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{t('priceLabel')} ({t('kwd')})</label>
                          <Input
                            type="number" min={0} step="0.001"
                            value={ed.price ?? so.price}
                            onChange={e => setField(so.id, 'price', e.target.value)}
                            className="h-9 rounded-xl bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{t('paidLabel')} ({t('kwd')})</label>
                          <Input
                            type="number" min={0} step="0.001"
                            value={ed.paidAmount ?? so.paidAmount}
                            onChange={e => setField(so.id, 'paidAmount', e.target.value)}
                            className="h-9 rounded-xl bg-background"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t('fabricDetails')}</label>
                        <Input
                          placeholder={t('fabricDescPlaceholder')}
                          value={ed.fabricDescription ?? so.fabricDescription ?? ''}
                          onChange={e => setField(so.id, 'fabricDescription', e.target.value)}
                          className="h-9 rounded-xl bg-background"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t('notesLabel')}</label>
                        <Textarea
                          placeholder={t('notesPlaceholder')}
                          value={ed.notes ?? so.notes ?? ''}
                          onChange={e => setField(so.id, 'notes', e.target.value)}
                          className="rounded-xl bg-background min-h-[60px]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New sub-order section */}
          <div>
            <h3 className="font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wide">{t('addNewOrder')}</h3>
            <div className="border-2 border-dashed border-primary/30 rounded-2xl p-4 space-y-3 bg-primary/5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">{t('profileLabel')}</label>
                  <Select value={String(newOrder.profileId || '')} onValueChange={v => setNewOrder(p => ({ ...p, profileId: Number(v) }))}>
                    <SelectTrigger className="h-9 rounded-xl bg-background"><SelectValue placeholder={t('choosePerson')} /></SelectTrigger>
                    <SelectContent className="bg-gray-900 text-white">
                      {mainProfiles.map((pr: any) => (
                        <SelectItem key={pr.id} value={String(pr.id)}>{pr.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('qty')}</label>
                  <Input
                    type="number" min={1}
                    value={newOrder.quantity}
                    onChange={e => setNewOrder(p => ({ ...p, quantity: Number(e.target.value) }))}
                    className="h-9 rounded-xl bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('fabricSource')}</label>
                  <Select value={newOrder.fabricSource} onValueChange={v => setNewOrder(p => ({ ...p, fabricSource: v }))}>
                    <SelectTrigger className="h-9 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-900 text-white">
                      <SelectItem value="shop_fabric">{t('shopFabric')}</SelectItem>
                      <SelectItem value="customer_fabric">{t('customerFabric')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('priceLabel')} ({t('kwd')})</label>
                  <Input
                    type="number" min={0} step="0.001"
                    value={newOrder.price}
                    onChange={e => setNewOrder(p => ({ ...p, price: e.target.value }))}
                    className="h-9 rounded-xl bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('paidLabel')} ({t('kwd')})</label>
                  <Input
                    type="number" min={0} step="0.001"
                    value={newOrder.paidAmount}
                    onChange={e => setNewOrder(p => ({ ...p, paidAmount: e.target.value }))}
                    className="h-9 rounded-xl bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('fabricDetails')}</label>
                <Input
                  placeholder={t('fabricDescPlaceholder')}
                  value={newOrder.fabricDescription}
                  onChange={e => setNewOrder(p => ({ ...p, fabricDescription: e.target.value }))}
                  className="h-9 rounded-xl bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('notesLabel')}</label>
                <Textarea
                  placeholder={t('notesPlaceholder')}
                  value={newOrder.notes}
                  onChange={e => setNewOrder(p => ({ ...p, notes: e.target.value }))}
                  className="rounded-xl bg-background min-h-[60px]"
                />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 pt-1">
            <Button className="flex-1 h-12 rounded-xl" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('saveAllChanges')}</>}
            </Button>
            <Button variant="outline" className="h-12 rounded-xl px-6" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const [showEditDialog, setShowEditDialog] = useState(false);

  const canEdit = user?.role === 'shop_manager' || user?.role === 'reception';

  const deliverMutation = useMarkInvoiceDelivered({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/invoices/${invoiceId}`] });
        toast({ title: t('invoiceDelivered') });
      }
    }
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
              <div className="flex items-center gap-3">
                <Badge className={`border-0 px-3 py-1 text-sm ${
                  inv.status === 'ready' ? 'bg-emerald-400 text-emerald-950' :
                  inv.status === 'delivered' ? 'bg-blue-400 text-blue-950' :
                  'bg-white text-primary'
                }`}>
                  {inv.status === 'ready' ? t('statusReadyDelivery') : inv.status === 'delivered' ? t('statusDeliveredFull') : t('underTailoring')}
                </Badge>
                {inv.status === 'ready' && inv.allSubOrdersReady && (
                  <Badge className="bg-accent text-accent-foreground border-0">{t('allReady')}</Badge>
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

          <div className="p-8 bg-background">
            <h3 className="font-display font-bold text-xl mb-4 text-primary">{t('orderDetails')} ({inv.subOrders.length})</h3>
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
                        <span className="bg-muted px-2 py-1 rounded-md">{t('qty')} {sub.quantity}</span>
                        <span className="bg-muted px-2 py-1 rounded-md">{sub.fabricSource === 'shop_fabric' ? t('shopFabric') : t('customerFabric')}</span>
                        {sub.fabricDescription && <span>{sub.fabricDescription}</span>}
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

            <div className="mt-8 bg-primary/5 rounded-3xl p-6 border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-6">
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
                    onClick={() => setShowEditDialog(true)}
                  >
                    <Plus className="w-5 h-5" /> {t('addEditOrders')}
                  </Button>
                )}
                {inv.status === 'ready' && (
                  <>
                    <Button
                      variant="outline"
                      className="rounded-xl h-14 flex-1 md:flex-none border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                      onClick={handleWhatsapp}
                    >
                      <MessageCircle className="w-5 h-5 ml-2" /> {t('whatsapp')}
                    </Button>
                    <Button
                      className="rounded-xl h-14 flex-1 md:flex-none bg-primary text-white hover:bg-primary/90 shadow-lg"
                      onClick={() => deliverMutation.mutate({ invoiceId })}
                      disabled={deliverMutation.isPending}
                    >
                      {deliverMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5 ml-2"/> {t('deliverToCustomer')}</>}
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

      {inv && (
        <AddEditOrdersDialog
          inv={inv}
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}
    </div>
  );
}
