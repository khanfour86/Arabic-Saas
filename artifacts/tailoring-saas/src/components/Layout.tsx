import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Home, Users, FileText, Settings, Scissors, LogOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const getNavItems = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'owner':
        return [
          { href: '/owner/dashboard', label: 'لوحة القيادة', icon: Home },
          { href: '/owner/shops', label: 'المحلات', icon: Users },
        ];
      case 'shop_manager':
        return [
          { href: '/shop/dashboard', label: 'الرئيسية', icon: Home },
          { href: '/shop/customers', label: 'العملاء', icon: Users },
          { href: '/shop/invoices', label: 'الفواتير', icon: FileText },
          { href: '/shop/tailor', label: 'الخياط', icon: Scissors },
          { href: '/shop/settings', label: 'الإعدادات', icon: Settings },
        ];
      case 'reception':
        return [
          { href: '/shop/dashboard', label: 'الرئيسية', icon: Home },
          { href: '/shop/customers', label: 'العملاء', icon: Users },
          { href: '/shop/invoices', label: 'الفواتير', icon: FileText },
        ];
      case 'tailor':
        return [
          { href: '/shop/tailor', label: 'قائمة العمل', icon: Scissors },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-primary text-primary-foreground shadow-2xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-primary-foreground/10">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg">
            <Scissors className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-tight">الخياطة الذكية</h1>
            <p className="text-xs text-primary-foreground/70">{user?.shopName || 'إدارة المنصة'}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active 
                    ? 'bg-accent text-accent-foreground font-bold shadow-md' 
                    : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-white'
                }`}>
                  <item.icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-primary-foreground/10">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary-foreground/5 mb-4">
            <div className="flex flex-col">
              <span className="text-sm font-bold">{user?.name}</span>
              <span className="text-xs text-primary-foreground/60">{
                user?.role === 'shop_manager' ? 'مدير محل' : 
                user?.role === 'reception' ? 'استقبال' : 
                user?.role === 'tailor' ? 'خياط' : 'مدير المنصة'
              }</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 justify-start gap-2"
            onClick={logout}
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-primary text-primary-foreground p-4 flex justify-between items-center z-20 shadow-md">
          <div className="flex items-center gap-2">
            <Scissors className="text-accent w-6 h-6" />
            <h1 className="font-display font-bold text-lg">{user?.shopName || 'الخياطة الذكية'}</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-primary-foreground">
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 px-2 pb-safe pt-2 flex justify-around items-center">
          {navItems.slice(0, 5).map((item) => {
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className="flex flex-col items-center justify-center p-2">
                  <div className={`p-1.5 rounded-full transition-all ${active ? 'bg-primary text-primary-foreground shadow-md -translate-y-1' : 'text-muted-foreground'}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] mt-1 transition-colors ${active ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
