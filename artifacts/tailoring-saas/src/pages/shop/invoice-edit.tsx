import React, { useState, useEffect } from 'react';
import { toEnglishDigits } from '@/lib/digits';
import { useGetInvoice, useGetCustomer } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Save, User, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

type EditableSubOrder = {
  id?: number;
  profileId: number;
  quantity: number;
  fabricSource: string;
  fabricDescription: string;
  price: number;
  paidAmount: number;
  notes: string;
  isNew?: boolean;
};

export function InvoiceEdit() {
  const params = useParams();
  const invoiceId = parseInt(params.id || '0');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, dir } = useTranslation();

  const { data: inv, isLoading: invLoading } = useGetInvoice(invoiceId);
  const { data: customer, isLoading: customerLoading } = useGetCustomer(
    inv?.customerId ?? 0,
    { query: { enabled: !!inv?.customerId } }
  );

  const [orders, setOrders] = useState<EditableSubOrder[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (inv && !initialized) {
      const existing: EditableSubOrder[] = (inv.subOrders ?? []).map((so: any) => ({
        id: so.id,
        profileId: so.profileId,
        quantity: so.quantity,
        fabricSource: so.fabricSource,
        fabricDescription: so.fabricDescription || '',
        price: so.price,
        paidAmount: so.paidAmount,
        notes: so.notes || '',
        isNew: false,
      }));
      setOrders(existing);
      setInitialized(true);
    }
  }, [inv, initialized]);

  const totalAmount = orders.reduce((s, o) => s + (Number(o.price) || 0), 0);
  const totalPaid = orders.reduce((s, o) => s + (Number(o.paidAmount) || 0), 0);

  const setField = (index: number, field: keyof EditableSubOrder, val: any) => {
    setOrders(prev => {
      const next = [...prev];
      (next[index] as any)[field] = val;
      return next;
    });
  };

  const addNew = () => {
    setOrders(prev => [
      ...prev,
      { profileId: 0, quantity: 1, fabricSource: 'shop_fabric', fabricDescription: '', price: 0, paidAmount: 0, notes: '', isNew: true }
    ]);
  };

  const remove = (index: number) => {
    setOrders(prev => prev.filter((_, i) => i !== index));
  };

  const computeDiff = (): any[] => {
    const changes: any[] = [];
    const fieldLabels: Record<string, string> = {
      quantity: 'qty',
      price: 'price',
      paidAmount: 'paidAmount',
      fabricSource: 'fabricSource',
      fabricDescription: 'fabricDescription',
    };

    for (const curr of orders.filter(o => !o.isNew)) {
      const orig = (inv?.subOrders ?? []).find((s: any) => s.id === curr.id);
      if (!orig) continue;
      for (const field of Object.keys(fieldLabels) as (keyof EditableSubOrder)[]) {
        const oldRaw = orig[field];
        const newRaw = curr[field];
        const oldNum = parseFloat(String(oldRaw ?? '0'));
        const newNum = parseFloat(String(newRaw ?? '0'));
        const isNumeric = ['quantity', 'price', 'paidAmount'].includes(field as string);
        const changed = isNumeric
          ? Math.abs(oldNum - newNum) > 0.0001
          : String(oldRaw ?? '') !== String(newRaw ?? '');
        if (changed) {
          changes.push({
            type: 'updated',
            subOrderId: curr.id,
            subOrderNumber: orig.subOrderNumber,
            profileName: orig.profileName,
            field,
            oldValue: oldRaw,
            newValue: newRaw,
          });
        }
      }
    }

    for (const curr of orders.filter(o => o.isNew)) {
      const profile = (customer?.profiles ?? []).find((p: any) => p.id === curr.profileId);
      changes.push({
        type: 'added',
        profileName: profile?.name ?? String(curr.profileId),
        quantity: curr.quantity,
        fabricSource: curr.fabricSource,
        price: curr.price,
        paidAmount: curr.paidAmount,
      });
    }

    return changes;
  };

  const handleSave = async () => {
    const newOnes = orders.filter(o => o.isNew);
    if (newOnes.some(o => !o.profileId)) {
      toast({ title: t('error'), description: t('mustSelectProfile'), variant: 'destructive' });
      return;
    }
    if (orders.some(o => !o.quantity || Number(o.quantity) <= 0)) {
      toast({ title: t('error'), description: t('mustEnterQty'), variant: 'destructive' });
      return;
    }
    if (newOnes.some(o => Number(o.price) <= 0)) {
      toast({ title: t('error'), description: t('mustEnterPrice'), variant: 'destructive' });
      return;
    }

    const diffChanges = computeDiff();

    setSaving(true);
    try {
      const existing = orders.filter(o => !o.isNew && o.id);
      const toAdd = orders.filter(o => o.isNew);

      await Promise.all(
        existing.map(o =>
          fetch(`/api/shop/suborders/${o.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quantity: Number(o.quantity),
              fabricSource: o.fabricSource,
              fabricDescription: o.fabricDescription || null,
              price: Number(o.price),
              paidAmount: Number(o.paidAmount),
              notes: o.notes || null,
            }),
          })
        )
      );

      for (const o of toAdd) {
        await fetch('/api/shop/suborders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId,
            profileId: Number(o.profileId),
            quantity: Number(o.quantity),
            fabricSource: o.fabricSource,
            fabricDescription: o.fabricDescription || null,
            price: Number(o.price),
            paidAmount: Number(o.paidAmount) || 0,
            notes: o.notes || null,
          }),
        });
      }

      if (diffChanges.length > 0) {
        await fetch(`/api/shop/invoices/${invoiceId}/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes: diffChanges }),
        });
      }

      queryClient.invalidateQueries({ queryKey: [`/api/shop/invoices/${invoiceId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/shop/invoices/${invoiceId}/history`] });
      queryClient.invalidateQueries({ queryKey: ['/api/shop/invoices'] });
      toast({ title: t('ordersUpdated') });
      setLocation(`/shop/invoices/${invoiceId}`);
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const ChevronNav = dir === 'rtl' ? ChevronLeft : ChevronRight;

  if (invLoading || customerLoading)
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!inv) return <div className="p-12 text-center text-red-500">{t('noInvoiceFound')}</div>;
  if (!customer) return <div className="p-12 text-center text-red-500">{t('customerNotFound')}</div>;

  const mainProfiles = (customer.profiles ?? []).sort((a: any, b: any) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    if (a.isProof !== b.isProof) return a.isProof ? -1 : 1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <Link href={`/shop/invoices/${invoiceId}`} className="inline-flex items-center text-muted-foreground hover:text-primary mb-2 gap-1">
        <ChevronNav className="w-4 h-4" /> {t('backToInvoice')}
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Edit3 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">{t('editInvoiceTitle')} #{inv.invoiceNumber}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground font-medium">
            <User className="w-4 h-4" /> {customer.name} - <span dir="ltr">{customer.phone}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {orders.map((order, index) => (
          <Card
            key={order.id ?? `new-${index}`}
            className={`border-0 shadow-lg rounded-2xl overflow-visible relative z-10 ${order.isNew ? 'ring-2 ring-primary/40' : ''}`}
          >
            <div className={`absolute -right-3 -top-3 w-8 h-8 ${order.isNew ? 'bg-emerald-500' : 'bg-primary'} text-white rounded-full flex items-center justify-center font-bold shadow-md text-sm`}>
              {order.isNew ? '+' : index + 1}
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold">{t('profileLabel')}</label>
                  <Select
                    value={order.profileId ? order.profileId.toString() : ''}
                    onValueChange={v => setField(index, 'profileId', parseInt(v))}
                    disabled={!order.isNew}
                  >
                    <SelectTrigger className="h-14 bg-muted/50 rounded-xl text-lg font-bold" dir={dir}>
                      <SelectValue placeholder={t('choosePerson')} />
                    </SelectTrigger>
                    <SelectContent dir={dir}>
                      {mainProfiles.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          <span className="flex items-center gap-2">
                            {p.name}
                            {p.isMain && <span className="text-xs bg-accent/30 text-accent-foreground px-1.5 py-0.5 rounded-full">{t('badgeMain')}</span>}
                            {p.isProof && <span className="text-xs bg-orange-500/20 text-orange-700 px-1.5 py-0.5 rounded-full">{t('badgeProof')}</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">
                    {t('quantityLabel')}
                    {(!order.quantity || order.quantity <= 0) && <span className="text-destructive mr-1">*</span>}
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={order.quantity || ''}
                    placeholder={t('enterQty')}
                    onChange={e => {
                      const raw = toEnglishDigits(e.target.value).replace(/[^0-9]/g, '');
                      setField(index, 'quantity', raw === '' ? 0 : parseInt(raw));
                    }}
                    className={`h-14 bg-muted/50 rounded-xl text-center text-lg font-bold ${(!order.quantity || order.quantity <= 0) ? 'border-destructive/50' : ''}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">{t('fabricSource')}</label>
                  <Select
                    value={order.fabricSource}
                    onValueChange={v => setField(index, 'fabricSource', v)}
                  >
                    <SelectTrigger className="h-14 bg-muted/50 rounded-xl font-bold" dir={dir}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir={dir}>
                      <SelectItem value="shop_fabric">{t('shopFabric')}</SelectItem>
                      <SelectItem value="customer_fabric">{t('customerFabric')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold">{t('fabricDetails')}</label>
                  <Input
                    value={order.fabricDescription || ''}
                    onChange={e => setField(index, 'fabricDescription', e.target.value)}
                    className="h-14 bg-muted/50 rounded-xl"
                    placeholder={t('fabricDetailsHint')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-primary">{t('totalPriceLabel')}</label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={order.price || ''}
                      onChange={e => {
                        const v = parseFloat(toEnglishDigits(e.target.value)) || 0;
                        setField(index, 'price', v);
                        if (Number(order.paidAmount) > v) setField(index, 'paidAmount', v);
                      }}
                      className="h-14 pl-12 bg-white border-primary/30 focus-visible:ring-primary rounded-xl text-xl font-bold text-primary"
                      dir="ltr"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{t('kwd')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-emerald-600">{t('paidAmountLabel')}</label>
                    {order.price > 0 && Number(order.paidAmount) === Number(order.price) && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{t('fullyPaid')}</span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={order.paidAmount || ''}
                      onChange={e => {
                        const paid = parseFloat(toEnglishDigits(e.target.value)) || 0;
                        setField(index, 'paidAmount', paid);
                      }}
                      className={`h-14 pl-12 bg-white rounded-xl text-xl font-bold transition-colors ${
                        Number(order.paidAmount) > Number(order.price) && Number(order.price) > 0
                          ? 'border-red-500 border-2 text-red-600'
                          : 'border-emerald-500/30 text-emerald-600'
                      }`}
                      dir="ltr"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{t('kwd')}</span>
                  </div>
                  {Number(order.price) > 0 && (
                    <p className={`text-xs font-bold ${Number(order.paidAmount) > Number(order.price) ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {Number(order.paidAmount) > Number(order.price)
                        ? t('paidExceedsTotal')
                        : <>{t('remaining')} <span className="text-foreground">{(Number(order.price) - Number(order.paidAmount)).toFixed(3)} {t('kwd')}</span></>
                      }
                    </p>
                  )}
                </div>

              </div>

              {(orders.length > 1 || order.isNew) && (
                <div className="mt-6 pt-4 border-t border-border text-left">
                  <Button
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4 ml-2" /> {t('removeOrder')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outline"
          className="w-full h-14 border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 rounded-2xl font-bold text-lg"
          onClick={addNew}
        >
          <Plus className="w-5 h-5 ml-2" /> {t('addAnotherOrder')}
        </Button>
      </div>

      <div className="sticky bottom-4 md:bottom-8 mt-12 bg-white/80 backdrop-blur-xl border border-border shadow-2xl rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-40">
        <div className="flex gap-6 w-full md:w-auto px-4 justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-bold">{t('invoiceTotalBar')}</div>
            <div className="text-2xl font-display font-bold text-primary">{totalAmount.toFixed(3)} {t('kwd')}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-bold">{t('colPaid')}</div>
            <div className="text-2xl font-display font-bold text-emerald-600">{totalPaid.toFixed(3)} {t('kwd')}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-bold">{t('colRemaining')}</div>
            <div className="text-2xl font-display font-bold text-red-500">{(totalAmount - totalPaid).toFixed(3)} {t('kwd')}</div>
          </div>
        </div>

        <Button
          className="w-full md:w-auto h-14 px-12 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 ml-2" /> {t('saveInvoice')}</>}
        </Button>
      </div>
    </div>
  );
}
