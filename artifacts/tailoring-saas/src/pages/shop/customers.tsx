import React, { useState, useRef, useEffect } from 'react';
import { toEnglishDigits } from '@/lib/digits';
import { useListCustomers, useCreateCustomer, getCustomer } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Phone, Search, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

function buildParams(search: string) {
  if (!search) return undefined;
  if (/^\d+$/.test(search)) return { phone: search };
  return { name: search };
}

export function CustomersList() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: shopStatusData } = useQuery({
    queryKey: ['/api/shop/status'],
    queryFn: () => fetch('/api/shop/status').then(r => r.ok ? r.json() : null),
    staleTime: 60000, retry: false,
  });
  const isRestricted = shopStatusData?.subscriptionStatus === 'expired' || shopStatusData?.subscriptionStatus === 'suspended';
  const isLightPlan = shopStatusData?.plan === 'light';
  const [, setLocation] = useLocation();
  const { t, dir } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useListCustomers(buildParams(debouncedSearch));
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

  const handleSuggestionClick = (customerId: number) => {
    setInputFocused(false);
    setSearch('');
    setLocation(`/shop/customers/${customerId}`);
  };

  const ChevronNav = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">{t('customersTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('customersSubtitle')}</p>
        </div>
        <CustomerCreateDialog
          trigger={
            <Button disabled={isRestricted} className="bg-primary text-white hover:bg-primary/90 shadow-lg rounded-xl gap-2 h-12 px-6 disabled:opacity-50">
              <Plus className="w-5 h-5" /> {t('addCustomer')}
            </Button>
          }
        />
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6 pointer-events-none z-10" />
        <Input
          ref={inputRef}
          className="h-16 pl-4 pr-14 text-lg rounded-2xl bg-white shadow-lg border-0 focus-visible:ring-accent"
          placeholder={t('searchCustomers')}
          value={search}
          onChange={(e) => setSearch(toEnglishDigits(e.target.value))}
          onFocus={() => setInputFocused(true)}
          dir={dir}
          autoComplete="off"
        />
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-border/50 z-50 overflow-hidden max-h-72 overflow-y-auto"
          >
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-primary/5 transition-colors text-right border-b border-border/30 last:border-b-0"
                onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(c.id); }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">{c.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5" dir="ltr">
                    <Phone className="w-3 h-3" />
                    <span className="font-mono tracking-wide">{c.phone}</span>
                  </p>
                </div>
                <ChevronNav className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/shop/customers/${customer.id}`}>
              <Card className={`hover-elevate cursor-pointer shadow-md hover:shadow-xl transition-all rounded-2xl group ${
                customer.isVip ? 'border-2 border-red-500 shadow-red-200' : 'border-0'
              }`}>
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:text-white transition-colors ${
                      customer.isVip
                        ? 'bg-red-100 group-hover:bg-red-500'
                        : 'bg-primary/10 group-hover:bg-primary'
                    }`}>
                      <User className={`w-6 h-6 group-hover:text-white ${customer.isVip ? 'text-red-500' : 'text-primary'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-foreground">{customer.name}</h3>
                        {customer.isVip && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">⭐ VIP</span>
                        )}
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1 mt-1 text-sm" dir="ltr">
                        <Phone className="w-3 h-3" />
                        <span className="font-mono tracking-wide">{customer.phone}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronNav className="text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </Card>
            </Link>
          ))}

          {customers.length === 0 && !isLoading && (
            <div className="col-span-full p-12 text-center text-muted-foreground bg-white rounded-2xl shadow-sm">
              <User className="w-12 h-12 mx-auto text-muted/50 mb-4" />
              <p className="text-lg">
                {debouncedSearch ? t('noMatchCustomers') : t('noCustomers')}
              </p>
              {debouncedSearch && /^\d+$/.test(debouncedSearch) && !isRestricted && (
                <CustomerCreateDialog
                  trigger={<Button variant="link" className="mt-2 text-accent">{t('addAsNew')}</Button>}
                  initialPhone={debouncedSearch}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerCreateDialog({ trigger, initialPhone = '' }: { trigger?: React.ReactNode; initialPhone?: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t, dir } = useTranslation();
  const { data: shopStatusData } = useQuery({
    queryKey: ['/api/shop/status'],
    queryFn: () => fetch('/api/shop/status').then(r => r.ok ? r.json() : null),
    staleTime: 60000, retry: false,
  });
  const isLightPlan = shopStatusData?.plan === 'light';

  useEffect(() => { setPhone(initialPhone); }, [initialPhone]);

const mutation = useCreateCustomer({
  mutation: {
    onSuccess: async (data) => {
      // حدّث قائمة العملاء مباشرة في الكاش
      queryClient.setQueryData(['/api/shop/customers'], (old: any) => {
        if (!old?.customers) {
          return { customers: [data] };
        }

        const exists = old.customers.some((c: any) => c.id === data.id);
        if (exists) return old;

        return {
          ...old,
          customers: [data, ...old.customers],
        };
      });

      // أعد تحميل قائمة العملاء من السيرفر
      await queryClient.invalidateQueries({
        queryKey: ['/api/shop/customers'],
      });

      // انتظر حتى تصير صفحة العميل الجديد جاهزة
      let customerReady = false;
      let attempts = 0;

      while (!customerReady && attempts < 8) {
        try {
          await getCustomer(data.id);
          customerReady = true;
        } catch {
          attempts += 1;
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      toast({ title: t('customerAdded') });
      setOpen(false);
      setPhone('');

      // افتح صفحة العميل الجديد بعد ما نتأكد إنها جاهزة
      setLocation(`/shop/customers/${data.id}`);
    },
    onError: (err: any) => {
      toast({
        title: t('error'),
        description: err?.message || t('phoneRegistered'),
        variant: 'destructive',
      });
    },
  },
});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (phone.length !== 8 || !/^\d{8}$/.test(phone)) {
      toast({ title: t('error'), description: t('phoneMustBe8'), variant: 'destructive' });
      return;
    }
    mutation.mutate({
      data: {
        name: fd.get('name') as string,
        phone,
        notes: fd.get('notes') as string || undefined,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPhone(initialPhone); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-primary text-white hover:bg-primary/90 shadow-lg rounded-xl gap-2 h-12 px-6">
            <Plus className="w-5 h-5" /> {t('addCustomer')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent dir={dir} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t('newCustomerProfile')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('customerName')}</label>
            <Input name="name" required className="bg-muted/50 rounded-xl h-12" placeholder={t('fullName')} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold">{t('phoneNumber')}</label>
              <span className={`text-xs font-mono ${phone.length === 8 ? 'text-green-600 font-bold' : 'text-muted-foreground'}`}>
                {phone.length} / 8
              </span>
            </div>
            <Input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 8))}
              required
              className="bg-muted/50 rounded-xl h-12 font-mono text-xl tracking-widest"
              dir="ltr"
              placeholder="XXXXXXXX"
              maxLength={8}
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t('phoneHint')}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('notes')}</label>
            <Input name="notes" className="bg-muted/50 rounded-xl h-12" />
          </div>
          <Button
            type="submit"
            className="w-full h-14 rounded-xl text-lg font-bold mt-6"
            disabled={mutation.isPending || phone.length !== 8}
          >
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t(isLightPlan ? 'saveContinueLight' : 'saveContinue')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
