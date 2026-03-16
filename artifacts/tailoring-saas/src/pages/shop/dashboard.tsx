import React, { useState } from 'react';
import { useGetShopDashboard, useListInvoices } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scissors, CheckCircle, Search, FilePlus, UserPlus, Clock } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';

export function ShopDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetShopDashboard();
  const { data: recentInvoices, isLoading: invoicesLoading } = useListInvoices();
  const [search, setSearch] = useState('');
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;
    // Simple heuristic: if it contains numbers only, search invoices, else customers.
    // Realistically, we'd search both, but let's navigate to customers search with prefill
    setLocation(`/shop/customers?q=${encodeURIComponent(search)}`);
  };

  if (statsLoading || invoicesLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">الرئيسية</h1>
          <p className="text-muted-foreground mt-2">نظرة عامة على سير العمل اليوم</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-96 relative group">
          <Input 
            placeholder="بحث برقم الهاتف أو الاسم..." 
            className="h-14 pl-12 rounded-2xl bg-white shadow-md border-0 focus-visible:ring-primary/20 transition-all group-hover:shadow-lg text-lg"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button type="submit" size="icon" className="absolute left-2 top-2 h-10 w-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
            <Search className="w-5 h-5" />
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashStatCard title="تحت الخياطة" value={stats?.underTailoring || 0} icon={<Scissors className="w-6 h-6 text-accent" />} color="bg-accent/10" />
        <DashStatCard title="جاهزة للتسليم" value={stats?.readyForDelivery || 0} icon={<Clock className="w-6 h-6 text-emerald-500" />} color="bg-emerald-500/10" />
        <DashStatCard title="تم التسليم اليوم" value={stats?.deliveredToday || 0} icon={<CheckCircle className="w-6 h-6 text-blue-500" />} color="bg-blue-500/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg text-primary flex items-center gap-2">
            <div className="w-2 h-6 bg-accent rounded-full" />
            إجراءات سريعة
          </h3>
          <Link href="/shop/customers" className="block">
            <Card className="hover-elevate cursor-pointer border-0 shadow-md bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl overflow-hidden relative">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <FilePlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">فاتورة جديدة</h4>
                  <p className="text-primary-foreground/70 text-sm">إنشاء طلب جديد لعميل</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/shop/customers?new=true" className="block">
            <Card className="hover-elevate cursor-pointer border-0 shadow-md bg-white rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-foreground">عميل جديد</h4>
                  <p className="text-muted-foreground text-sm">إضافة ملف عميل وقياسات</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Invoices */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-primary flex items-center gap-2">
              <div className="w-2 h-6 bg-primary rounded-full" />
              أحدث الفواتير
            </h3>
            <Link href="/shop/invoices" className="text-sm font-bold text-accent hover:underline">عرض الكل</Link>
          </div>
          <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
            <div className="divide-y">
              {recentInvoices?.invoices.slice(0, 5).map(inv => (
                <Link key={inv.id} href={`/shop/invoices/${inv.id}`}>
                  <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg group-hover:text-primary transition-colors">#{inv.invoiceNumber}</span>
                        <Badge variant="outline" className={`border-0 text-xs rounded-full ${
                          inv.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                          inv.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                          'bg-accent/20 text-accent-foreground'
                        }`}>
                          {inv.status === 'ready' ? 'جاهز' : inv.status === 'delivered' ? 'مسلم' : 'تحت الخياطة'}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground mt-1">{inv.customerName} - {inv.customerPhone}</span>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-lg">{inv.totalAmount} د.ك</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(inv.createdAt), 'yyyy/MM/dd')}</div>
                    </div>
                  </div>
                </Link>
              ))}
              {(!recentInvoices?.invoices || recentInvoices.invoices.length === 0) && (
                <div className="p-8 text-center text-muted-foreground">لا توجد فواتير حديثة</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashStatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <Card className="border-0 shadow-md bg-white rounded-2xl overflow-hidden">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-3xl font-display font-bold text-foreground">{value}</h3>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
