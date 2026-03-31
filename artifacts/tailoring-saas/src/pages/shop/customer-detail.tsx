import React, { useState, useRef, useEffect } from 'react';
import { toEnglishDigits } from '@/lib/digits';
import { useGetCustomer, useCreateProfile, useUpsertMeasurements, useUpdateCustomer, useUpdateProfile } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Plus, Loader2, FilePlus, Save, Ruler, StickyNote, Scissors, Pencil, X, Check, Clock, FileText, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { format } from 'date-fns';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

function InlineEditPhone({
  value,
  onSave,
  isPending,
  t,
}: {
  value: string;
  onSave: (phone: string, onError: (msg: string) => void, onSuccess: () => void) => void;
  isPending: boolean;
  t: (k: any) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const openEdit = () => { setDraft(''); setError(''); setEditing(true); };
  const cancel   = () => { setEditing(false); setDraft(''); setError(''); };

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 8);
    setDraft(digits);
    setError('');
  };

  const commit = () => {
    if (draft.length !== 8) {
      setError(t('mustBe8Digits'));
      inputRef.current?.focus();
      return;
    }
    if (draft === value) { cancel(); return; }
    onSave(
      draft,
      (msg) => { setError(msg); inputRef.current?.focus(); },
      () => { setEditing(false); setDraft(''); setError(''); }
    );
  };

  if (!editing) {
    return (
      <button
        onClick={openEdit}
        className="group/edit flex items-center gap-2 hover:opacity-80 transition-opacity"
        title={t('clickToEditPhone')}
        dir="ltr"
      >
        <span>{value}</span>
        <Pencil className="w-3.5 h-3.5 opacity-0 group-hover/edit:opacity-60 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-1"
      onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            ref={inputRef}
            value={draft}
            onChange={handleChange}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
            className="h-9 text-base font-bold bg-white/20 border-white/30 text-white placeholder:text-white/30 rounded-lg w-36"
            dir="ltr"
            inputMode="numeric"
            maxLength={8}
            disabled={isPending}
            placeholder=""
          />
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20 rounded-lg" onClick={commit} disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20 rounded-lg" onClick={cancel} disabled={isPending}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      {error && <span className="text-red-300 text-xs font-bold mt-0.5">{error}</span>}
    </div>
  );
}

function InlineEdit({ value, onSave, isPending, clickToEdit }: { value: string; onSave: (v: string) => void; isPending: boolean; clickToEdit: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) { setEditing(false); setDraft(value); return; }
    onSave(trimmed);
    setEditing(false);
  };

  const cancel = () => { setEditing(false); setDraft(value); };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group/edit flex items-center gap-2 text-right hover:opacity-80 transition-opacity"
        title={clickToEdit}
      >
        <span>{value}</span>
        <Pencil className="w-3.5 h-3.5 opacity-0 group-hover/edit:opacity-60 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        className="h-9 text-lg font-bold bg-white/20 border-white/30 text-inherit placeholder:text-inherit/50 rounded-lg min-w-0 w-48"
        disabled={isPending}
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 text-inherit hover:bg-white/20 rounded-lg" onClick={commit} disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-inherit hover:bg-white/20 rounded-lg" onClick={cancel} disabled={isPending}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

function InlineEditDark({ value, onSave, isPending, clickToEdit }: { value: string; onSave: (v: string) => void; isPending: boolean; clickToEdit: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) { setEditing(false); setDraft(value); return; }
    onSave(trimmed);
    setEditing(false);
  };

  const cancel = () => { setEditing(false); setDraft(value); };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group/edit flex items-center gap-2 text-right hover:opacity-80 transition-opacity"
        title={clickToEdit}
      >
        <span>{value}</span>
        <Pencil className="w-3.5 h-3.5 opacity-0 group-hover/edit:opacity-50 transition-opacity shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        className="h-9 font-bold bg-muted/50 rounded-lg min-w-0 w-44"
        disabled={isPending}
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={commit} disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg" onClick={cancel} disabled={isPending}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function CustomerDetail() {
  const params = useParams();
  const customerId = parseInt(params.id || '0');
  const { data: customer, isLoading } = useGetCustomer(customerId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, dir } = useTranslation();
  const [selectedProfileId, setSelectedProfileId] = React.useState<number | null>(null);
  const [measurementPopup, setMeasurementPopup] = React.useState<any | null>(null);
  const [showAllMeasurements, setShowAllMeasurements] = React.useState(false);
  const [invoicePopupId, setInvoicePopupId] = React.useState<number | null>(null);

  const { data: shopStatusData } = useQuery({
    queryKey: ['/api/shop/status'],
    queryFn: () => fetch('/api/shop/status').then(r => r.ok ? r.json() : null),
    staleTime: 60000, retry: false,
  });

  const { data: invoicePopupData, isLoading: invoicePopupLoading } = useQuery({
    queryKey: [`/api/shop/invoices/${invoicePopupId}`],
    queryFn: () => fetch(`/api/shop/invoices/${invoicePopupId}`).then(r => r.ok ? r.json() : null),
    enabled: !!invoicePopupId,
  });

  const { data: activityData } = useQuery({
    queryKey: [`/api/shop/customers/${customerId}/activity`, selectedProfileId],
    queryFn: () => {
      const url = selectedProfileId
        ? `/api/shop/customers/${customerId}/activity?profileId=${selectedProfileId}`
        : `/api/shop/customers/${customerId}/activity`;
      return fetch(url).then(r => r.ok ? r.json() : null);
    },
    enabled: !!customerId,
  });
  const isRestricted = shopStatusData?.subscriptionStatus === 'expired' || shopStatusData?.subscriptionStatus === 'suspended';
  const isLightPlan = shopStatusData?.plan === 'light';

  const { data: lightInvoicesData } = useQuery({
    queryKey: [`/api/shop/invoices`, customerId, 'light'],
    queryFn: () => fetch(`/api/shop/invoices?customerId=${customerId}&limit=5`).then(r => r.ok ? r.json() : null),
    enabled: !!customerId && isLightPlan,
  });
  const lightInvoices: any[] = lightInvoicesData?.invoices ?? [];

  const canEdit = (user?.role === 'shop_manager' || user?.role === 'reception') && !isRestricted;
  const canEditPhone = user?.role === 'shop_manager' && !isRestricted;

  const updateCustomerMutation = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}`] });
        toast({ title: t('updatedSuccess') });
      },
      onError: () => toast({ title: t('updateError'), variant: 'destructive' }),
    }
  });

  // Initialize to main profile once customer data loads
  React.useEffect(() => {
    if (!customer) return;
    const mainProfiles = customer.profiles.filter((p: any) => !p.isProof);
    const main = mainProfiles.find((p: any) => p.isMain) ?? mainProfiles[0];
    if (main && selectedProfileId === null) setSelectedProfileId(main.id);
  }, [customer]);

  // Reset show-all state when profile selection changes
  React.useEffect(() => {
    setShowAllMeasurements(false);
  }, [selectedProfileId]);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!customer) return <div>{t('customerNotFound')}</div>;

  const allMeasurementUpdates: any[] = activityData?.measurementUpdates ?? [];
  const filteredMeasurements = activityData
    ? (showAllMeasurements ? allMeasurementUpdates : allMeasurementUpdates.slice(0, 5))
    : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <Card className="border-0 shadow-xl rounded-2xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground relative overflow-hidden">
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg border border-white/20">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                {canEdit ? (
                  <div className="text-3xl font-display font-bold">
                    <InlineEdit
                      value={customer.name}
                      isPending={updateCustomerMutation.isPending}
                      clickToEdit={t('clickToEdit')}
                      onSave={(name) => updateCustomerMutation.mutate({ customerId, data: { name } })}
                    />
                  </div>
                ) : (
                  <h1 className="text-3xl font-display font-bold">{customer.name}</h1>
                )}
                {customer.isVip && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-500/40 animate-in fade-in">
                    ⭐ {t('vipActive')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-primary-foreground/80">
                <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg">
                  <Phone className="w-4 h-4" />
                  {canEditPhone ? (
                    <InlineEditPhone
                      value={customer.phone}
                      isPending={updateCustomerMutation.isPending}
                      t={t}
                      onSave={(phone, onError, onSuccess) => {
                        updateCustomerMutation.mutate(
                          { customerId, data: { phone } },
                          {
                            onSuccess: () => {
                              queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}`] });
                              onSuccess();
                            },
                            onError: (err: any) => {
                              const msg = err?.data?.error ?? t('updateError');
                              onError(msg);
                            },
                          }
                        );
                      }}
                    />
                  ) : (
                    <span dir="ltr">{customer.phone}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            {isRestricted ? (
              <Button disabled className="bg-accent/50 text-accent-foreground rounded-xl h-14 px-8 text-lg font-bold gap-2 w-full opacity-50 cursor-not-allowed">
                <FilePlus className="w-6 h-6" /> {t('newInvoice')}
              </Button>
            ) : (
              <Link href={`/shop/invoices/new?customerId=${customer.id}`} className="w-full">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 rounded-xl h-14 px-8 text-lg font-bold gap-2 hover:-translate-y-1 transition-all w-full">
                  <FilePlus className="w-6 h-6" /> {t('newInvoice')}
                </Button>
              </Link>
            )}
            {user?.role === 'shop_manager' && !isRestricted && (
              <button
                onClick={() => updateCustomerMutation.mutate({ customerId, data: { isVip: !customer.isVip } })}
                disabled={updateCustomerMutation.isPending}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all text-sm font-bold w-full justify-center ${
                  customer.isVip
                    ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/30'
                    : 'bg-white/10 border-white/30 text-white/80 hover:bg-white/20'
                }`}
              >
                <span>{customer.isVip ? '⭐' : '☆'}</span>
                {t('vipToggle')}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLightPlan ? (
        /* ── Light plan: invoice history ── */
        <div className="mt-6">
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2 mb-4">
            <div className="w-2 h-6 bg-accent rounded-full" />
            <FileText className="w-5 h-5" />
            {t('lightInvoiceHistory')}
          </h2>
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {!lightInvoicesData ? (
                <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : lightInvoices.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
                  <FileText className="w-6 h-6 opacity-40" />
                  <p className="text-sm">{t('lightNoInvoices')}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {lightInvoices.map((inv: any) => (
                    <Link key={inv.id} href={`/shop/invoices/${inv.id}`}>
                      <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">#{inv.invoiceNumber}</span>
                            {inv.bookNumber && (
                              <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">
                                {t('lightBookRef')} {inv.bookNumber}
                                {inv.pageNumber ? ` / ${t('lightPageRef')} ${inv.pageNumber}` : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(inv.createdAt), 'yyyy/MM/dd')}
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="font-bold text-primary">{Number(inv.totalAmount).toFixed(3)} {t('kwd')}</div>
                          <div className={`text-xs font-bold mt-0.5 ${inv.status === 'delivered' ? 'text-emerald-600' : inv.status === 'ready' ? 'text-blue-600' : 'text-amber-600'}`}>
                            {inv.status === 'delivered' ? t('statusDelivered') : inv.status === 'ready' ? t('statusReady') : t('statusUnder')}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Profiles section header */}
          <div className="flex items-center justify-between mt-8 mb-2">
            <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
              <div className="w-2 h-6 bg-accent rounded-full" />
              {t('measurementProfiles')}
            </h2>
            <ProfileCreateDialog customerId={customer.id} t={t} />
          </div>

          {/* Profile selector dropdown */}
          {(() => {
            const mainProfiles = customer.profiles.filter((p: any) => !p.isProof);
            const activeProfile = mainProfiles.find((p: any) => p.id === selectedProfileId) ?? mainProfiles[0];
            return (
              <>
                {mainProfiles.length > 1 && (
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-sm font-bold text-muted-foreground whitespace-nowrap">{t('selectProfile')}:</label>
                    <Select
                      value={selectedProfileId?.toString() ?? ''}
                      onValueChange={(val) => setSelectedProfileId(parseInt(val))}
                      dir={dir}
                    >
                      <SelectTrigger className="bg-white border-primary/20 rounded-xl shadow-sm max-w-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir={dir}>
                        {mainProfiles.map((p: any) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                            {p.isMain && (
                              <span className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded-full mr-1.5">{t('badgeMain')}</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {activeProfile && (
                  <ProfileCard
                    key={activeProfile.id}
                    profile={activeProfile}
                    customerId={customer.id}
                    canEdit={canEdit}
                    t={t}
                  />
                )}
              </>
            );
          })()}

          {/* Measurement Updates */}
          <div>
            <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2 mb-4">
              <div className="w-2 h-6 bg-primary/40 rounded-full" />
              <Clock className="w-5 h-5" />
              {t('recentMeasurementUpdates')}
            </h2>
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {!filteredMeasurements ? (
                  <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : filteredMeasurements.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
                    <Ruler className="w-6 h-6 opacity-40" />
                    <p className="text-sm">{t('noMeasurementUpdates')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredMeasurements.map((u: any) => (
                      <button
                        key={u.profileId}
                        onClick={() => setMeasurementPopup(u)}
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer text-start"
                      >
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Ruler className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{u.profileName}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                            {[
                              { k: t('mLength'), v: u.length },
                              { k: t('mShoulder'), v: u.shoulder },
                              { k: t('mChest'), v: u.chest },
                              { k: t('mSleeve'), v: u.sleeve },
                              { k: t('mNeck'), v: u.neck },
                            ].filter(f => f.v != null).map(f => (
                              <span key={f.k}><span className="text-muted-foreground/60">{f.k}:</span> <span className="font-medium text-foreground">{f.v}</span></span>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{format(new Date(u.updatedAt), 'yyyy/MM/dd')}</span>
                      </button>
                    ))}
                    {!showAllMeasurements && allMeasurementUpdates.length > 5 && (
                      <button
                        onClick={() => setShowAllMeasurements(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-primary font-bold hover:bg-muted/30 transition-colors border-t border-border"
                      >
                        {t('showMore')} ({allMeasurementUpdates.length - 5})
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Measurement detail popup */}
      <Dialog open={!!measurementPopup} onOpenChange={(open) => { if (!open) setMeasurementPopup(null); }}>
        <DialogContent dir={dir} className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              {measurementPopup?.profileName}
              {measurementPopup?.isMain && (
                <span className="text-[10px] bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">{t('badgeMain')}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {measurementPopup && (
            <div className="space-y-5 mt-2">
              {/* Date */}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('lastMeasurementUpdate')} {format(new Date(measurementPopup.updatedAt), 'yyyy/MM/dd')}
              </p>

              {/* Measurements grid */}
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {[
                  { label: t('mLength'), value: measurementPopup.length },
                  { label: t('mShoulder'), value: measurementPopup.shoulder },
                  { label: t('mChest'), value: measurementPopup.chest },
                  { label: t('mSleeve'), value: measurementPopup.sleeve },
                  { label: t('mNeck'), value: measurementPopup.neck },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/40 p-3 rounded-xl">
                    <div className="text-muted-foreground text-xs mb-1">{label}</div>
                    <div className="font-bold text-primary text-base">{value ?? '-'}</div>
                  </div>
                ))}
              </div>

              {/* Model notes */}
              {measurementPopup.modelNotes && (
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex gap-2 items-start">
                  <Scissors className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-accent-foreground mb-1">{t('modelNotes')}</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{measurementPopup.modelNotes}</p>
                  </div>
                </div>
              )}

              {/* General notes */}
              {measurementPopup.generalNotes && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 items-start">
                  <StickyNote className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-600 mb-1">{t('generalNotes')}</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{measurementPopup.generalNotes}</p>
                  </div>
                </div>
              )}

              {/* Close button */}
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setMeasurementPopup(null)}
              >
                <X className="w-4 h-4 ml-2" /> {t('closeDialog')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice detail popup */}
      <Dialog open={!!invoicePopupId} onOpenChange={(open) => { if (!open) setInvoicePopupId(null); }}>
        <DialogContent dir={dir} className="sm:max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('invoiceDetails')}
            </DialogTitle>
          </DialogHeader>

          {invoicePopupLoading || !invoicePopupData ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (() => {
            const inv = invoicePopupData;
            const isDelivered = inv.status === 'delivered';
            const isReady = !isDelivered && inv.allSubOrdersReady;
            const badgeCls = isDelivered
              ? 'bg-emerald-100 text-emerald-700'
              : isReady
              ? 'bg-blue-100 text-blue-700'
              : 'bg-amber-100 text-amber-700';
            const badgeLabel = isDelivered ? t('statusDeliveredFull') : isReady ? t('statusReadyDelivery') : t('statusUnder');

            return (
              <div className="space-y-4">
                {/* Invoice header row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-lg font-bold">{t('invoiceNum')}{inv.invoiceNumber}</p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${badgeCls}`}>{badgeLabel}</span>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{t('invoiceCreatedAt')}</p>
                    <p className="font-semibold">{format(new Date(inv.createdAt), 'yyyy/MM/dd')}</p>
                  </div>
                  {inv.deliveredAt && (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">{t('invoiceDeliveredAt')}</p>
                      <p className="font-semibold text-emerald-700">{format(new Date(inv.deliveredAt), 'yyyy/MM/dd')}</p>
                    </div>
                  )}
                </div>

                {/* Financial summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{t('invoiceTotalAmount')}</p>
                    <p className="font-bold text-base">{inv.totalAmount} {t('kwd')}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{t('invoicePaid')}</p>
                    <p className="font-bold text-base text-emerald-700">{inv.paidAmount} {t('kwd')}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${inv.remainingAmount > 0 ? 'bg-amber-50' : 'bg-muted/40'}`}>
                    <p className="text-xs text-muted-foreground mb-0.5">{t('invoiceRemaining')}</p>
                    <p className={`font-bold text-base ${inv.remainingAmount > 0 ? 'text-amber-700' : ''}`}>{inv.remainingAmount} {t('kwd')}</p>
                  </div>
                </div>

                {/* Sub-orders */}
                {inv.subOrders?.length > 0 && (
                  <div className="space-y-2">
                    {inv.subOrders.map((so: any) => {
                      const soIsReady = so.status === 'ready';
                      return (
                        <div key={so.id} className="border border-border rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm">{t('orderNum')}{so.subOrderNumber} — {so.profileName}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${soIsReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {soIsReady ? t('ready') : t('statusUnder')}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>{t('qtyLabel')} {so.quantity}</span>
                            <span>{t('fabricLabel')} {so.fabricSource === 'customer' ? t('fabricFromCustomer') : t('fabricFromShop')}</span>
                            {so.fabricDescription && <span className="text-foreground/70">{so.fabricDescription}</span>}
                          </div>
                          <div className="flex gap-4 text-xs">
                            <span>{t('invoiceTotalAmount')}: <strong>{so.price} {t('kwd')}</strong></span>
                            <span>{t('invoicePaid')}: <strong>{so.paidAmount} {t('kwd')}</strong></span>
                          </div>
                          {so.notes && <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-2 py-1">{so.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Invoice notes */}
                {inv.notes && (
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">{t('notesLabel')}</p>
                    <p className="text-sm">{inv.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <Link href={`/shop/invoices/${inv.id}`}>
                    <Button variant="default" className="w-full rounded-xl gap-2" onClick={() => setInvoicePopupId(null)}>
                      <FileText className="w-4 h-4" /> {t('viewInvoicePage')}
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => setInvoicePopupId(null)}>
                    <X className="w-4 h-4" /> {t('closeDialog')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Recent Invoices — premium only */}
      {!isLightPlan && (
      <div>
        <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2 mb-4">
          <div className="w-2 h-6 bg-accent/60 rounded-full" />
          <FileText className="w-5 h-5" />
          {t('recentCustomerInvoices')}
        </h2>
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {!activityData ? (
              <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : activityData.invoices?.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
                <FileText className="w-6 h-6 opacity-40" />
                <p className="text-sm">{t('noRecentInvoices')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activityData.invoices?.map((inv: any) => {
                  const isDelivered = inv.status === 'delivered';
                  const isReady = !isDelivered && inv.allSubOrdersReady;
                  const badgeCls = isDelivered
                    ? 'bg-emerald-100 text-emerald-700'
                    : isReady
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700';
                  const badgeLabel = isDelivered ? t('statusDeliveredFull') : isReady ? t('statusReadyDelivery') : t('statusUnder');
                  return (
                    <button key={inv.id} onClick={() => setInvoicePopupId(inv.id)} className="w-full text-start">
                      <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-accent-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{t('invoiceNum')}{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(inv.createdAt), 'yyyy/MM/dd')}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${badgeCls}`}>{badgeLabel}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  );
                })}
                {activityData.invoiceTotal > 5 && (
                  <Link href={`/shop/invoices?customerId=${customer.id}`}>
                    <button className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-primary font-bold hover:bg-muted/30 transition-colors">
                      {t('showMore')} ({activityData.invoiceTotal - 5})
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}

function ProfileCard({ profile, customerId, canEdit, t }: { profile: any; customerId: number; canEdit: boolean; t: (k: any) => string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateProfileMutation = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}`] });
        toast({ title: t('profileUpdated') });
      },
      onError: () => toast({ title: t('updateError'), variant: 'destructive' }),
    }
  });

  const m = profile.measurements;

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden group hover:shadow-xl transition-all">
      <div className={`h-2 w-full ${profile.isMain ? 'bg-accent' : 'bg-primary/20'}`} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap">
              {canEdit ? (
                <InlineEditDark
                  value={profile.name}
                  isPending={updateProfileMutation.isPending}
                  clickToEdit={t('clickToEdit')}
                  onSave={(name) => updateProfileMutation.mutate({ profileId: profile.id, data: { name } })}
                />
              ) : (
                <span>{profile.name}</span>
              )}
              {profile.isMain && (
                <span className="text-[10px] bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">{t('badgeMain')}</span>
              )}
            </div>
            {profile.notes && <p className="text-sm text-muted-foreground mt-1">{profile.notes}</p>}
            {m?.updatedAt && (
              <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                <Ruler className="w-3 h-3 inline shrink-0" />
                {t('lastMeasurementUpdate')} {format(new Date(m.updatedAt), 'yyyy/MM/dd')}
              </p>
            )}
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-4 mb-4 space-y-4">
          {m ? (
            <>
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {[
                  { label: t('mLength'), value: m.length },
                  { label: t('mShoulder'), value: m.shoulder },
                  { label: t('mChest'), value: m.chest },
                  { label: t('mSleeve'), value: m.sleeve },
                  { label: t('mNeck'), value: m.neck },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white p-2 rounded-lg shadow-sm">
                    <div className="text-muted-foreground text-xs mb-1">{label}</div>
                    <div className="font-bold text-primary">{value ?? '-'}</div>
                  </div>
                ))}
              </div>

              {m.modelNotes && (
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex gap-2 items-start">
                  <Scissors className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-accent-foreground mb-0.5">{t('modelNotes')}</div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{m.modelNotes}</p>
                  </div>
                </div>
              )}

              {m.generalNotes && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 items-start">
                  <StickyNote className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-blue-600 mb-0.5">{t('generalNotes')}</div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{m.generalNotes}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground flex flex-col items-center gap-2">
              <Ruler className="w-6 h-6 opacity-50" />
              {t('noMeasurements')}
            </div>
          )}
        </div>

        <MeasurementsDialog profile={profile} customerId={customerId} t={t} />
      </CardContent>
    </Card>
  );
}

function ProfileCreateDialog({ customerId, t }: { customerId: number; t: (k: any) => string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { dir } = useTranslation();
  const mutation = useCreateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}`] });
        toast({ title: t('profileAdded') });
        setOpen(false);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({ data: { customerId, name: fd.get('name') as string, isMain: false } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-2 font-bold bg-white shadow-sm border-primary/20 text-primary">
          <Plus className="w-4 h-4" /> {t('addAnotherPerson')}
        </Button>
      </DialogTrigger>
      <DialogContent dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('addProfileTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('personNameHint')}</label>
            <Input name="name" required className="bg-muted/50 rounded-xl" />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('saveBtn')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MeasurementsDialog({ profile, customerId, t }: { profile: any; customerId: number; t: (k: any) => string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { dir } = useTranslation();
  const mutation = useUpsertMeasurements({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}/activity`] });
        toast({ title: t('measurementsSaved') });
        setOpen(false);
      },
      onError: (err: any) => {
        toast({ title: t('savingError'), description: err?.message || t('unexpectedError'), variant: 'destructive' });
      }
    }
  });

  const m = profile.measurements || {};

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      profileId: profile.id,
      data: {
        length:       fd.get('length')   ? Number(fd.get('length'))   : null,
        shoulder:     fd.get('shoulder') ? Number(fd.get('shoulder')) : null,
        chest:        fd.get('chest')    ? Number(fd.get('chest'))    : null,
        sleeve:       fd.get('sleeve')   ? Number(fd.get('sleeve'))   : null,
        neck:         fd.get('neck')     ? Number(fd.get('neck'))     : null,
        modelNotes:   fd.get('modelNotes')   as string,
        generalNotes: fd.get('generalNotes') as string,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full rounded-xl gap-2 hover:bg-primary hover:text-white transition-colors">
          <Ruler className="w-4 h-4" /> {t('updateMeasurements')}
        </Button>
      </DialogTrigger>
      <DialogContent dir={dir} className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary border-b pb-4">{t('measurementsFor')} {profile.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: t('mLength'), name: 'length' },
              { label: t('mShoulder'), name: 'shoulder' },
              { label: t('mChest'), name: 'chest' },
              { label: t('mSleeve'), name: 'sleeve' },
              { label: t('mNeck'), name: 'neck' },
            ].map(({ label, name }) => (
              <div key={name} className="space-y-2">
                <label className="text-sm font-bold text-primary">{label}</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  name={name}
                  defaultValue={(m as any)[name] || ''}
                  onInput={(e) => {
                    const inp = e.target as HTMLInputElement;
                    inp.value = toEnglishDigits(inp.value);
                  }}
                  className="h-12 text-lg text-center font-bold bg-muted/50 rounded-xl"
                />
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <label className="text-sm font-bold">{t('modelNotesHint')}</label>
              <Textarea name="modelNotes" defaultValue={m.modelNotes || ''} className="min-h-24 bg-muted/50 rounded-xl resize-none" placeholder={t('tailoringDetails')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">{t('generalNotes')}</label>
              <Textarea name="generalNotes" defaultValue={m.generalNotes || ''} className="bg-muted/50 rounded-xl resize-none" />
            </div>
          </div>

          <Button type="submit" className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 ml-2" /> {t('saveMeasurements')}</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
