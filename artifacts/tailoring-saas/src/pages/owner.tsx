import React, { useState, useEffect, useRef } from 'react';
import { toEnglishDigits } from '@/lib/digits';
import { useGetOwnerStats, useListShops, useCreateShop, useUpdateShop, ListShopsStatus } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Store, Users, CheckCircle, XCircle, Plus, Loader2, Calendar, Pencil, KeyRound, User, ShieldCheck, Scissors, PhoneCall, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function OwnerDashboard() {
  const { data: stats, isLoading } = useGetOwnerStats();
  const { t } = useTranslation();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">{t('ownerDashTitle')}</h1>
        <p className="text-muted-foreground mt-2">{t('ownerDashSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('statTotalShops')} value={stats.totalShops} icon={<Store className="w-6 h-6 text-primary" />} />
        <StatCard title={t('statActiveShops')} value={stats.activeShops} icon={<CheckCircle className="w-6 h-6 text-emerald-500" />} />
        <StatCard title={t('statExpiredShops')} value={stats.expiredShops} icon={<XCircle className="w-6 h-6 text-red-500" />} />
        <StatCard title={t('statNewMonth')} value={stats.newThisMonth} icon={<Users className="w-6 h-6 text-accent" />} />
      </div>

      <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="font-display text-xl">{t('chartTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.shopsByArea} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="area" tick={{ fontFamily: 'Cairo', fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <Card className="hover-elevate shadow-md border-0 bg-white rounded-2xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-1.5 h-full bg-accent/50 group-hover:bg-accent transition-colors" />
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-display font-bold text-foreground">{value}</h3>
        </div>
        <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function OwnerShops() {
  const [statusFilter, setStatusFilter] = useState<ListShopsStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useListShops({ status: statusFilter === 'all' ? null : statusFilter });
  const [createOpen, setCreateOpen] = useState(false);
  const { t, dir } = useTranslation();

  const q = search.trim().toLowerCase();
  const filteredShops = q
    ? (data?.shops ?? []).filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.area.toLowerCase().includes(q)
      )
    : (data?.shops ?? []);

  const filters = [
    { id: 'all', label: t('filterAll') },
    { id: 'active', label: t('filterActive') },
    { id: 'expired', label: t('filterExpired') },
    { id: 'suspended', label: t('filterSuspended') },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">{t('ownerShopsTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('ownerShopsSubtitle')}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 rounded-xl gap-2 hover:-translate-y-0.5 transition-all">
              <Plus className="w-5 h-5" /> {t('addShop')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden" dir={dir}>
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="font-display text-2xl text-primary">{t('addShop')}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 overscroll-contain -mx-6 px-6 pb-2">
              <ShopCreateForm onSuccess={() => setCreateOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
        <div className="p-4 border-b bg-white">
          <div className="relative">
            <Store className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(toEnglishDigits(e.target.value))}
              placeholder={t('searchShops')}
              className="h-12 pr-12 pl-4 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary text-base"
              dir={dir}
              autoComplete="off"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-b bg-muted/50 flex gap-2 overflow-x-auto">
          {filters.map(filter => (
            <Button
              key={filter.id}
              variant={statusFilter === filter.id ? 'default' : 'outline'}
              className={`rounded-full px-6 ${statusFilter === filter.id ? 'shadow-md' : 'bg-white'}`}
              onClick={() => setStatusFilter(filter.id as any)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="divide-y">
            {filteredShops.map(shop => (
              <div key={shop.id} className="p-4 md:p-6 hover:bg-primary/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{shop.name}</h3>
                    <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                      <span>{shop.area}</span>
                      <span>•</span>
                      <span dir="ltr">{shop.phone}</span>
                      <span>•</span>
                      <span>{t('shopManager')}: {shop.managerName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end md:self-auto">
                  <div className="text-left hidden md:block">
                    <div className="text-xs text-muted-foreground mb-1">{t('expiryDate')}</div>
                    <div className="font-semibold text-sm flex items-center gap-1 justify-end">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(shop.subscriptionEnd), 'yyyy/MM/dd')}
                    </div>
                  </div>
                  <Badge variant="outline" className={`px-3 py-1 rounded-full text-xs border-0 ${
                    shop.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    shop.subscriptionStatus === 'expired' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {shop.subscriptionStatus === 'active' ? t('filterActive') :
                     shop.subscriptionStatus === 'expired' ? t('filterExpired') : t('filterSuspended')}
                  </Badge>
                  <ShopEditDialog shop={shop} />
                </div>
              </div>
            ))}
            {filteredShops.length === 0 && (
              <div className="p-12 text-center space-y-2">
                <Store className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <p className="text-muted-foreground">
                  {search ? `${t('noResults')} "${search}"` : t('noShops')}
                </p>
                {search && (
                  <button onClick={() => setSearch('')} className="text-sm text-primary underline">
                    {t('clearSearch')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function useDebounce<T>(value: T, delay = 450): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function useUniqueCheck(field: string, value: string, minLen = 1) {
  const [checking, setChecking] = useState(false);
  const [taken, setTaken] = useState(false);
  const debounced = useDebounce(value);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounced.length < minLen) { setTaken(false); setChecking(false); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setChecking(true);
    fetch(`/api/owner/check-unique?field=${field}&value=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => { setTaken(data.taken); setChecking(false); })
      .catch(() => setChecking(false));
    return () => ctrl.abort();
  }, [debounced, field, minLen]);

  return { taken, checking };
}

function FieldStatus({ checking, taken, takenMsg, checkingMsg }: { checking: boolean; taken: boolean; takenMsg: string; checkingMsg: string }) {
  if (checking) return <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" />{checkingMsg}</p>;
  if (taken) return <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{takenMsg}</p>;
  return null;
}

function ShopCreateForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, dir } = useTranslation();

  const today = new Date().toISOString().split('T')[0];
  const [shopName, setShopName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [subscriptionStart, setSubscriptionStart] = useState(today);
  const [durationMonths, setDurationMonths] = useState(12);

  const DURATION_OPTIONS = [
    { label: t('duration3'), months: 3 },
    { label: t('duration6'), months: 6 },
    { label: t('duration12'), months: 12 },
    { label: t('duration24'), months: 24 },
  ];

  const subscriptionEnd = addMonths(subscriptionStart, durationMonths);

  const nameCheck = useUniqueCheck('name', shopName, 2);
  const phoneCheck = useUniqueCheck('phone', phone, 8);
  const usernameCheck = useUniqueCheck('username', managerUsername, 3);

  const hasError = nameCheck.taken || phoneCheck.taken || usernameCheck.taken;
  const stillChecking = nameCheck.checking || phoneCheck.checking || usernameCheck.checking;

  const allFilled =
    shopName.trim().length > 0 &&
    managerName.trim().length > 0 &&
    phone.length === 8 &&
    area.trim().length > 0 &&
    subscriptionStart.length > 0 &&
    managerUsername.trim().length > 0 &&
    managerPassword.trim().length >= 6;

  const mutation = useCreateShop({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/owner/shops'] });
        queryClient.invalidateQueries({ queryKey: ['/api/owner/stats'] });
        toast({ title: t('shopCreated') });
        onSuccess();
      },
      onError: (err) => toast({ title: t('error'), description: err.message, variant: 'destructive' })
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!allFilled || hasError || stillChecking) return;
    mutation.mutate({
      data: {
        name: shopName,
        managerName,
        phone,
        area,
        subscriptionStart,
        subscriptionEnd,
        subscriptionStatus: 'active',
        managerUsername,
        managerPassword,
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold">{t('shopName')}</label>
          <Input
            value={shopName}
            onChange={e => setShopName(e.target.value)}
            required
            className={`bg-muted/50 rounded-xl ${nameCheck.taken ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          <FieldStatus checking={nameCheck.checking} taken={nameCheck.taken} takenMsg={t('shopNameTaken')} checkingMsg={t('checking')} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold">{t('managerName')}</label>
          <Input
            value={managerName}
            onChange={e => setManagerName(e.target.value)}
            className="bg-muted/50 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold">{t('phone')}</label>
            <span className={`text-xs font-mono ${phone.length === 8 && !phoneCheck.taken ? 'text-green-600 font-bold' : phoneCheck.taken ? 'text-destructive' : 'text-muted-foreground'}`}>
              {phone.length} / 8
            </span>
          </div>
          <Input
            value={phone}
            onChange={e => setPhone(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 8))}
            required
            className={`bg-muted/50 rounded-xl font-mono tracking-widest ${phoneCheck.taken ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            dir="ltr"
            placeholder="XXXXXXXX"
            inputMode="numeric"
            autoComplete="off"
          />
          {!phoneCheck.taken && <p className="text-xs text-muted-foreground">{t('phoneHint')}</p>}
          <FieldStatus checking={phoneCheck.checking} taken={phoneCheck.taken} takenMsg={t('phoneTaken')} checkingMsg={t('checking')} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold">{t('area')}</label>
          <Input
            value={area}
            onChange={e => setArea(e.target.value)}
            className="bg-muted/50 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold">{t('subscriptionStart')}</label>
          <Input
            type="date"
            value={subscriptionStart}
            onChange={e => setSubscriptionStart(e.target.value)}
            required
            className="bg-muted/50 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold">{t('subscriptionDuration')}</label>
          <div className="grid grid-cols-2 gap-2">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.months}
                type="button"
                onClick={() => setDurationMonths(opt.months)}
                className={`h-11 rounded-xl text-sm font-bold border-2 transition-all ${
                  durationMonths === opt.months
                    ? 'border-primary bg-primary text-white shadow-md'
                    : 'border-muted bg-muted/50 text-foreground hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {subscriptionEnd && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              {t('subscriptionEnd')} <span className="font-bold text-foreground" dir="ltr">{subscriptionEnd}</span>
            </p>
          )}
        </div>
      </div>

      <div className="p-4 bg-primary/5 rounded-xl space-y-4 border border-primary/10">
        <h3 className="font-bold text-primary">{t('managerCredentials')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('username')}</label>
            <Input
              value={managerUsername}
              onChange={e => setManagerUsername(e.target.value.trim())}
              required
              className={`bg-white rounded-xl ${usernameCheck.taken ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              dir="ltr"
              autoComplete="off"
            />
            <FieldStatus checking={usernameCheck.checking} taken={usernameCheck.taken} takenMsg={t('usernameTaken')} checkingMsg={t('checking')} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">{t('password')}</label>
            <Input
              value={managerPassword}
              onChange={e => setManagerPassword(e.target.value)}
              className="bg-white rounded-xl"
              dir="ltr"
              type="password"
            />
            <p className={`text-xs ${managerPassword.length > 0 && managerPassword.length < 6 ? 'text-destructive' : 'text-muted-foreground'}`}>
              لازم 6 أحرف على الأقل
            </p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-xl text-lg font-bold"
        disabled={mutation.isPending || !allFilled || hasError || stillChecking}
      >
        {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('saveCreateShop')}
      </Button>
    </form>
  );
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  shop_manager: <ShieldCheck className="w-4 h-4 text-primary" />,
  reception: <PhoneCall className="w-4 h-4 text-accent" />,
  tailor: <Scissors className="w-4 h-4 text-amber-500" />,
};

function UserEditRow({ shopId, user, onSaved }: { shopId: number; user: any; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user.username);
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();

  const ROLE_LABELS: Record<string, string> = {
    shop_manager: t('roleManager'),
    reception: t('roleReception'),
    tailor: t('roleTailor'),
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (password && password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      const body: any = {};
      if (username !== user.username) body.username = username;
      if (name !== user.name) body.name = name;
      if (password) body.password = password;
      const res = await fetch(`/api/owner/shops/${shopId}/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || t('updateError'));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('userUpdated') });
      setPassword('');
      setEditing(false);
      onSaved();
    },
    onError: (err: any) => toast({ title: t('error'), description: err.message, variant: 'destructive' }),
  });

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            {ROLE_ICONS[user.role] ?? <User className="w-4 h-4" />}
          </div>
          <div>
            <p className="font-bold text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span dir="ltr">{user.username}</span>
              <span>·</span>
              <span>{ROLE_LABELS[user.role] ?? user.role}</span>
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="gap-1 text-primary" onClick={() => setEditing(true)}>
          <Pencil className="w-3.5 h-3.5" /> {t('editUser')}
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-primary/20 rounded-xl p-4 space-y-3 bg-primary/5">
      <div className="flex items-center gap-2 mb-1">
        {ROLE_ICONS[user.role]}
        <span className="font-bold text-sm">{ROLE_LABELS[user.role] ?? user.role}</span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground">{t('fullNameLabel')}</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="h-10 bg-white rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground">{t('usernameLabel')}</label>
          <Input value={username} onChange={e => setUsername(e.target.value)} className="h-10 bg-white rounded-lg text-sm" dir="ltr" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> {t('newPasswordLabel')} ({t('leaveEmpty')})
          </label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-10 bg-white rounded-lg text-sm" dir="ltr" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('saveBtn')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setEditing(false); setUsername(user.username); setName(user.name); setPassword(''); }}>
          ✕
        </Button>
      </div>
    </div>
  );
}

function ShopEditDialog({ shop }: { shop: any }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'info' | 'users'>('info');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, dir } = useTranslation();

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: [`/api/owner/shops/${shop.id}/users`],
    queryFn: async () => {
      const res = await fetch(`/api/owner/shops/${shop.id}/users`);
      if (!res.ok) throw new Error('Error fetching users');
      return res.json() as Promise<{ users: any[] }>;
    },
    enabled: open,
  });

  const shopMutation = useUpdateShop({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/owner/shops'] });
        queryClient.invalidateQueries({ queryKey: ['/api/owner/stats'] });
        toast({ title: t('updatedSuccess') });
      },
      onError: (err) => toast({ title: t('error'), description: err.message, variant: 'destructive' }),
    }
  });

  const handleShopSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    shopMutation.mutate({
      shopId: shop.id,
      data: {
        name: fd.get('name') as string,
        managerName: fd.get('managerName') as string,
        phone: fd.get('phone') as string,
        area: fd.get('area') as string,
        subscriptionStart: fd.get('subscriptionStart') as string,
        subscriptionEnd: fd.get('subscriptionEnd') as string,
        subscriptionStatus: fd.get('subscriptionStatus') as any,
        notes: fd.get('notes') as string || undefined,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-1.5"><Pencil className="w-3.5 h-3.5" /> {t('editUser')}</Button>
      </DialogTrigger>
      <DialogContent dir={dir} className="sm:max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" /> {shop.name}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 overscroll-contain -mx-6 px-6">
          <div className="flex border-b mb-4">
            <button
              className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTab('info')}
            >{t('shopName')}</button>
            <button
              className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTab('users')}
            ><Users className="w-4 h-4" /> {t('systemUsers')}</button>
          </div>

          {tab === 'info' && (
            <form onSubmit={handleShopSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">{t('shopName')}</label>
                  <Input name="name" defaultValue={shop.name} required className="bg-muted/50 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">{t('managerName')}</label>
                  <Input name="managerName" defaultValue={shop.managerName} required className="bg-muted/50 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">{t('phone')}</label>
                  <Input name="phone" defaultValue={shop.phone} required className="bg-muted/50 rounded-xl" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">{t('area')}</label>
                  <Input name="area" defaultValue={shop.area} required className="bg-muted/50 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">{t('subscriptionStart')}</label>
                  <Input type="date" name="subscriptionStart" defaultValue={shop.subscriptionStart?.split('T')[0]} required className="bg-muted/50 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">{t('subscriptionEnd')}</label>
                  <Input type="date" name="subscriptionEnd" defaultValue={shop.subscriptionEnd?.split('T')[0]} required className="bg-muted/50 rounded-xl" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold">{t('filterActive')}/{t('filterExpired')}/{t('filterSuspended')}</label>
                  <Select name="subscriptionStatus" defaultValue={shop.subscriptionStatus}>
                    <SelectTrigger className="bg-muted/50 rounded-xl" dir={dir}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir={dir}>
                      <SelectItem value="active">{t('filterActive')}</SelectItem>
                      <SelectItem value="expired">{t('filterExpired')}</SelectItem>
                      <SelectItem value="suspended">{t('filterSuspended')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold">{t('notes')}</label>
                  <Input name="notes" defaultValue={shop.notes ?? ''} className="bg-muted/50 rounded-xl" />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={shopMutation.isPending}>
                {shopMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('saveBtn')}
              </Button>
            </form>
          )}

          {tab === 'users' && (
            <div className="space-y-2">
              {!usersData ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : usersData.users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('noCustomers')}</p>
              ) : (
                usersData.users.map(user => (
                  <UserEditRow key={user.id} shopId={shop.id} user={user} onSaved={refetchUsers} />
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
