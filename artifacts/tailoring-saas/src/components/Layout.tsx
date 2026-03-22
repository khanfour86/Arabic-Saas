import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { Home, Users, FileText, Settings, Scissors, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t, lang, setLang, dir } = useTranslation();

  const { data: shopStatusData } = useQuery({
    queryKey: ['/api/shop/status'],
    queryFn: () => fetch('/api/shop/status').then(r => r.ok ? r.json() : null),
    enabled: !!user?.shopId,
    staleTime: 60000,
    retry: false,
  });
  const isRestricted = shopStatusData?.subscriptionStatus === 'expired' || shopStatusData?.subscriptionStatus === 'suspended';
  const statusLabel = shopStatusData?.subscriptionStatus === 'expired' ? 'منتهي' : shopStatusData?.subscriptionStatus === 'suspended' ? 'موقوف' : '';

  const getNavItems = () => {
    if (!user) return [];
    switch (user.role) {
      case 'owner':
        return [
          { href: '/owner/dashboard', label: t('navDashboard'), icon: Home },
          { href: '/owner/shops', label: t('navShops'), icon: Users },
        ];
      case 'shop_manager':
        return [
          { href: '/shop/dashboard', label: t('navHome'), icon: Home },
          { href: '/shop/customers', label: t('navCustomers'), icon: Users },
          { href: '/shop/invoices', label: t('navInvoices'), icon: FileText },
          { href: '/shop/tailor', label: t('navTailor'), icon: Scissors },
          { href: '/shop/settings', label: t('navSettings'), icon: Settings },
        ];
      case 'reception':
        return [
          { href: '/shop/dashboard', label: t('navHome'), icon: Home },
          { href: '/shop/customers', label: t('navCustomers'), icon: Users },
          { href: '/shop/invoices', label: t('navInvoices'), icon: FileText },
        ];
      case 'tailor':
        return [
          { href: '/shop/tailor', label: t('navWorkQueue'), icon: Scissors },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const roleLabel =
    user?.role === 'shop_manager' ? t('roleManager') :
    user?.role === 'reception' ? t('roleReception') :
    user?.role === 'tailor' ? t('roleTailor') : t('roleOwner');

  const LangToggle = () => (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground transition-colors border border-primary-foreground/20"
      title={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
    >
      {t('language')}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full" dir={dir}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-primary text-primary-foreground shadow-2xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-primary-foreground/10">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg">
            <Scissors className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-tight">{t('appName')}</h1>
            <p className="text-xs text-primary-foreground/70">{user?.shopName || t('platformAdmin')}</p>
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
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary-foreground/5 mb-3">
            <div className="flex flex-col">
              <span className="text-sm font-bold">{user?.name}</span>
              <span className="text-xs text-primary-foreground/60">{roleLabel}</span>
            </div>
            <LangToggle />
          </div>
          <Button
            variant="ghost"
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 justify-start gap-2"
            onClick={logout}
          >
            <LogOut className="w-5 h-5" />
            {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-primary text-primary-foreground p-4 flex justify-between items-center z-20 shadow-md">
          <div className="flex items-center gap-2">
            <Scissors className="text-accent w-6 h-6" />
            <h1 className="font-display font-bold text-lg">{user?.shopName || t('appName')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Button variant="ghost" size="icon" onClick={logout} className="text-primary-foreground">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            {isRestricted && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-2 text-destructive text-sm font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t('shopRestricted')}</span>
                <span className="font-bold">({statusLabel})</span>
              </div>
            )}
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
