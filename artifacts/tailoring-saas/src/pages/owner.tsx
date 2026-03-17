import React, { useState } from 'react';
import { useGetOwnerStats, useListShops, useCreateShop, useUpdateShop, ListShopsStatus } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Store, Users, CheckCircle, XCircle, Plus, Loader2, Calendar, Pencil, KeyRound, User, ShieldCheck, Scissors, PhoneCall } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function OwnerDashboard() {
  const { data: stats, isLoading } = useGetOwnerStats();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">لوحة القيادة</h1>
        <p className="text-muted-foreground mt-2">إحصائيات المنصة والمحلات المشتركة</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المحلات" value={stats.totalShops} icon={<Store className="w-6 h-6 text-primary" />} />
        <StatCard title="المحلات النشطة" value={stats.activeShops} icon={<CheckCircle className="w-6 h-6 text-emerald-500" />} />
        <StatCard title="المنتهية اشتراكها" value={stats.expiredShops} icon={<XCircle className="w-6 h-6 text-red-500" />} />
        <StatCard title="جديد هذا الشهر" value={stats.newThisMonth} icon={<Users className="w-6 h-6 text-accent" />} />
      </div>

      <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="font-display text-xl">توزيع المحلات حسب المنطقة</CardTitle>
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
  const { data, isLoading } = useListShops({ status: statusFilter === 'all' ? null : statusFilter });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">إدارة المحلات</h1>
          <p className="text-muted-foreground mt-2">عرض وإدارة المحلات المشتركة في المنصة</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 rounded-xl gap-2 hover:-translate-y-0.5 transition-all">
              <Plus className="w-5 h-5" /> إضافة محل جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary">إضافة محل جديد</DialogTitle>
            </DialogHeader>
            <ShopCreateForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
        <div className="p-4 border-b bg-muted/50 flex gap-2 overflow-x-auto">
          {['all', 'active', 'expired', 'suspended'].map(filter => (
            <Button 
              key={filter}
              variant={statusFilter === filter ? 'default' : 'outline'}
              className={`rounded-full px-6 ${statusFilter === filter ? 'shadow-md' : 'bg-white'}`}
              onClick={() => setStatusFilter(filter as any)}
            >
              {filter === 'all' ? 'الكل' : 
               filter === 'active' ? 'نشط' : 
               filter === 'expired' ? 'منتهي' : 'موقوف'}
            </Button>
          ))}
        </div>
        
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="divide-y">
            {data?.shops.map(shop => (
              <div key={shop.id} className="p-4 md:p-6 hover:bg-primary/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{shop.name}</h3>
                    <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                      <span>{shop.area}</span>
                      <span>•</span>
                      <span>{shop.phone}</span>
                      <span>•</span>
                      <span>المدير: {shop.managerName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end md:self-auto">
                  <div className="text-left hidden md:block">
                    <div className="text-xs text-muted-foreground mb-1">تاريخ الانتهاء</div>
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
                    {shop.subscriptionStatus === 'active' ? 'نشط' :
                     shop.subscriptionStatus === 'expired' ? 'منتهي' : 'موقوف'}
                  </Badge>
                  <ShopEditDialog shop={shop} />
                </div>
              </div>
            ))}
            {data?.shops.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">لا توجد محلات تطابق البحث</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

const DURATION_OPTIONS = [
  { label: '٣ أشهر', months: 3 },
  { label: '٦ أشهر', months: 6 },
  { label: 'سنة', months: 12 },
  { label: 'سنتان', months: 24 },
];

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function ShopCreateForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const [phone, setPhone] = useState('');
  const [subscriptionStart, setSubscriptionStart] = useState(today);
  const [durationMonths, setDurationMonths] = useState(12);

  const subscriptionEnd = addMonths(subscriptionStart, durationMonths);

  const mutation = useCreateShop({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/owner/shops'] });
        queryClient.invalidateQueries({ queryKey: ['/api/owner/stats'] });
        toast({ title: 'تم إنشاء المحل بنجاح' });
        onSuccess();
      },
      onError: (err) => toast({ title: 'خطأ', description: err.message, variant: 'destructive' })
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phone.length !== 8) {
      toast({ title: 'خطأ', description: 'رقم الهاتف يجب أن يكون 8 أرقام', variant: 'destructive' });
      return;
    }
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      data: {
        name: fd.get('name') as string,
        managerName: fd.get('managerName') as string,
        phone,
        area: fd.get('area') as string,
        subscriptionStart,
        subscriptionEnd,
        subscriptionStatus: 'active',
        managerUsername: fd.get('managerUsername') as string,
        managerPassword: fd.get('managerPassword') as string,
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold">اسم المحل</label>
          <Input name="name" required className="bg-muted/50 rounded-xl" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold">اسم المدير</label>
          <Input name="managerName" required className="bg-muted/50 rounded-xl" />
        </div>

        {/* Phone — 8 digits only */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold">رقم الهاتف</label>
            <span className={`text-xs font-mono ${phone.length === 8 ? 'text-green-600 font-bold' : 'text-muted-foreground'}`}>
              {phone.length} / 8
            </span>
          </div>
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
            required
            className="bg-muted/50 rounded-xl font-mono tracking-widest"
            dir="ltr"
            placeholder="XXXXXXXX"
            inputMode="numeric"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">أرقام فقط — بدون رمز الدولة (965)</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold">المنطقة</label>
          <Input name="area" required className="bg-muted/50 rounded-xl" />
        </div>

        {/* Subscription start */}
        <div className="space-y-2">
          <label className="text-sm font-bold">بداية الاشتراك</label>
          <Input
            type="date"
            value={subscriptionStart}
            onChange={e => setSubscriptionStart(e.target.value)}
            required
            className="bg-muted/50 rounded-xl"
          />
        </div>

        {/* Duration picker → auto-computes end date */}
        <div className="space-y-2">
          <label className="text-sm font-bold">مدة الاشتراك</label>
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
              نهاية الاشتراك: <span className="font-bold text-foreground" dir="ltr">{subscriptionEnd}</span>
            </p>
          )}
        </div>
      </div>

      <div className="p-4 bg-primary/5 rounded-xl space-y-4 border border-primary/10">
        <h3 className="font-bold text-primary">بيانات دخول المدير</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">اسم المستخدم</label>
            <Input name="managerUsername" required className="bg-white rounded-xl" dir="ltr" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">كلمة المرور</label>
            <Input name="managerPassword" required className="bg-white rounded-xl" dir="ltr" />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold" disabled={mutation.isPending || phone.length !== 8}>
        {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ وإنشاء المحل'}
      </Button>
    </form>
  );
}

const ROLE_LABELS: Record<string, string> = {
  shop_manager: 'مدير المحل',
  reception: 'استقبال',
  tailor: 'خياط',
};
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

  const mutation = useMutation({
    mutationFn: async () => {
      const body: any = {};
      if (username !== user.username) body.username = username;
      if (name !== user.name) body.name = name;
      if (password) body.password = password;
      const res = await fetch(`/api/owner/shops/${shopId}/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'خطأ في التحديث');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'تم تحديث المستخدم' });
      setPassword('');
      setEditing(false);
      onSaved();
    },
    onError: (err: any) => toast({ title: 'خطأ', description: err.message, variant: 'destructive' }),
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
          <Pencil className="w-3.5 h-3.5" /> تعديل
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
          <label className="text-xs font-bold text-muted-foreground">الاسم الكامل</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="h-10 bg-white rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground">اسم المستخدم</label>
          <Input value={username} onChange={e => setUsername(e.target.value)} className="h-10 bg-white rounded-lg text-sm" dir="ltr" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> كلمة مرور جديدة (اتركها فارغة إذا لا تريد تغييرها)
          </label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-10 bg-white rounded-lg text-sm" dir="ltr" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setEditing(false); setUsername(user.username); setName(user.name); setPassword(''); }}>
          إلغاء
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

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: [`/api/owner/shops/${shop.id}/users`],
    queryFn: async () => {
      const res = await fetch(`/api/owner/shops/${shop.id}/users`);
      if (!res.ok) throw new Error('خطأ في جلب المستخدمين');
      return res.json() as Promise<{ users: any[] }>;
    },
    enabled: open,
  });

  const shopMutation = useUpdateShop({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/owner/shops'] });
        queryClient.invalidateQueries({ queryKey: ['/api/owner/stats'] });
        toast({ title: 'تم تحديث بيانات المحل' });
      },
      onError: (err) => toast({ title: 'خطأ', description: err.message, variant: 'destructive' }),
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
        <Button variant="outline" className="rounded-xl gap-1.5"><Pencil className="w-3.5 h-3.5" /> تعديل</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" /> {shop.name}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('info')}
          >بيانات المحل</button>
          <button
            className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('users')}
          ><Users className="w-4 h-4" /> المستخدمون</button>
        </div>

        {tab === 'info' && (
          <form onSubmit={handleShopSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">اسم المحل</label>
                <Input name="name" defaultValue={shop.name} required className="bg-muted/50 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">اسم المدير</label>
                <Input name="managerName" defaultValue={shop.managerName} required className="bg-muted/50 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">رقم الهاتف</label>
                <Input name="phone" defaultValue={shop.phone} required className="bg-muted/50 rounded-xl" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">المنطقة</label>
                <Input name="area" defaultValue={shop.area} required className="bg-muted/50 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">بداية الاشتراك</label>
                <Input type="date" name="subscriptionStart" defaultValue={shop.subscriptionStart?.split('T')[0]} required className="bg-muted/50 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">نهاية الاشتراك</label>
                <Input type="date" name="subscriptionEnd" defaultValue={shop.subscriptionEnd?.split('T')[0]} required className="bg-muted/50 rounded-xl" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold">حالة الاشتراك</label>
                <Select name="subscriptionStatus" defaultValue={shop.subscriptionStatus}>
                  <SelectTrigger className="bg-muted/50 rounded-xl" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="expired">منتهي</SelectItem>
                    <SelectItem value="suspended">موقوف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold">ملاحظات</label>
                <Input name="notes" defaultValue={shop.notes ?? ''} className="bg-muted/50 rounded-xl" placeholder="ملاحظات اختيارية..." />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={shopMutation.isPending}>
              {shopMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ بيانات المحل'}
            </Button>
          </form>
        )}

        {tab === 'users' && (
          <div className="space-y-2">
            {!usersData ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : usersData.users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد مستخدمون لهذا المحل</p>
            ) : (
              usersData.users.map(user => (
                <UserEditRow key={user.id} shopId={shop.id} user={user} onSaved={refetchUsers} />
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
