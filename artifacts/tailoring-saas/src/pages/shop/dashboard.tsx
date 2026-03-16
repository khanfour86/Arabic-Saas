import React, { useState, useRef, useEffect } from 'react';
import { useGetShopDashboard, useListInvoices, useListCustomers } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scissors, CheckCircle, Search, FilePlus, UserPlus, Clock, User, Phone, ChevronLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';

function buildParams(search: string) {
  if (!search) return undefined;
  if (/^\d+$/.test(search)) return { phone: search };
  return { name: search };
}

function CustomerQuickSearch() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data } = useListCustomers(buildParams(debouncedSearch));
  const customers = data?.customers ?? [];
  const showDropdown = inputFocused && search.length > 0 && customers.length > 0;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        inputRef.current?.contains(e.target as Node)
      ) return;
      setInputFocused(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (id: number) => {
    setInputFocused(false);
    setSearch('');
    setLocation(`/shop/customers/${id}`);
  };

  return (
    <div className="relative w-full md:w-96">
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none z-10" />
      <Input
        ref={inputRef}
        placeholder="بحث برقم الهاتف أو الاسم..."
        className="h-14 pr-12 pl-4 rounded-2xl bg-white shadow-md border-0 focus-visible:ring-primary/20 transition-all hover:shadow-lg text-lg"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setInputFocused(true)}
        autoComplete="off"
        dir="rtl"
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-border/50 z-50 overflow-hidden max-h-64 overflow-y-auto"
        >
          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-right border-b border-border/20 last:border-b-0"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(c.id); }}
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="font-bold text-sm text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground font-mono" dir="ltr">{c.phone}</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShopDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetShopDashboard();
  const { data: recentInvoices, isLoading: invoicesLoading } = useListInvoices();

  if (statsLoading || invoicesLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">الرئيسية</h1>
          <p className="text-muted-foreground mt-2">نظرة عامة على سير العمل اليوم</p>
        </div>
        <CustomerQuickSearch />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/shop/invoices?status=under_tailoring">
          <DashStatCard title="تحت الخياطة" value={stats?.underTailoring || 0} icon={<Scissors className="w-6 h-6 text-accent" />} color="bg-accent/10" />
        </Link>
        <Link href="/shop/invoices?status=ready">
          <DashStatCard title="جاهزة للتسليم" value={stats?.readyForDelivery || 0} icon={<Clock className="w-6 h-6 text-emerald-500" />} color="bg-emerald-500/10" />
        </Link>
        <Link href="/shop/invoices?status=delivered">
          <DashStatCard title="تم التسليم اليوم" value={stats?.deliveredToday || 0} icon={<CheckCircle className="w-6 h-6 text-blue-500" />} color="bg-blue-500/10" />
        </Link>
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
                      <span className="text-sm text-muted-foreground mt-1">{inv.customerName} - <span dir="ltr">{inv.customerPhone}</span></span>
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
    <Card className="hover-elevate cursor-pointer border-0 shadow-md bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all group">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-3xl font-display font-bold text-foreground">{value}</h3>
          <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
