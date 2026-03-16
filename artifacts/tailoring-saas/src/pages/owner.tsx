import React, { useState } from 'react';
import { useGetOwnerStats, useListShops, useCreateShop, useUpdateShop, ListShopsStatus } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Store, Users, CheckCircle, XCircle, AlertCircle, Plus, Loader2, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQueryClient } from '@tanstack/react-query';
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

function ShopCreateForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      data: {
        name: fd.get('name') as string,
        managerName: fd.get('managerName') as string,
        phone: fd.get('phone') as string,
        area: fd.get('area') as string,
        subscriptionStart: fd.get('subscriptionStart') as string,
        subscriptionEnd: fd.get('subscriptionEnd') as string,
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
        <div className="space-y-2">
          <label className="text-sm font-bold">رقم الهاتف</label>
          <Input name="phone" required className="bg-muted/50 rounded-xl" dir="ltr" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold">المنطقة</label>
          <Input name="area" required className="bg-muted/50 rounded-xl" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold">بداية الاشتراك</label>
          <Input type="date" name="subscriptionStart" required className="bg-muted/50 rounded-xl" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold">نهاية الاشتراك</label>
          <Input type="date" name="subscriptionEnd" required className="bg-muted/50 rounded-xl" />
        </div>
      </div>

      <div className="p-4 bg-primary/5 rounded-xl space-y-4 border border-primary/10">
        <h3 className="font-bold text-primary">بيانات دخول المدير</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">اسم المستخدم</label>
            <Input name="managerUsername" required className="bg-white rounded-xl" dir="ltr" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">كلمة المرور</label>
            <Input name="managerPassword" required className="bg-white rounded-xl" dir="ltr" />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ وإنشاء المحل'}
      </Button>
    </form>
  );
}

function ShopEditDialog({ shop }: { shop: any }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useUpdateShop({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/owner/shops'] });
        queryClient.invalidateQueries({ queryKey: ['/api/owner/stats'] });
        toast({ title: 'تم التحديث بنجاح' });
        setOpen(false);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      shopId: shop.id,
      data: {
        subscriptionStatus: fd.get('status') as any,
        subscriptionEnd: fd.get('subscriptionEnd') as string,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">تعديل</Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>تحديث حالة المحل: {shop.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">الحالة</label>
            <Select name="status" defaultValue={shop.subscriptionStatus}>
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
          <div className="space-y-2">
            <label className="text-sm font-bold">نهاية الاشتراك</label>
            <Input type="date" name="subscriptionEnd" defaultValue={shop.subscriptionEnd.split('T')[0]} required className="bg-muted/50 rounded-xl" />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl mt-4" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ التغييرات'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
