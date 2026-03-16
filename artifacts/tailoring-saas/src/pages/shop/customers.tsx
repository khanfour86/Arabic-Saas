import React, { useState, useRef, useEffect } from 'react';
import { useListCustomers, useCreateCustomer } from '@workspace/api-client-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Phone, Search, Plus, Loader2, ChevronLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function CustomersList() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const isPhoneSearch = debouncedSearch.length > 0 && /^\d+$/.test(debouncedSearch);
  const isNameSearch = debouncedSearch.length > 0 && !/^\d+$/.test(debouncedSearch);

  // Main list query (debounced)
  const { data, isLoading } = useListCustomers({
    phone: isPhoneSearch ? debouncedSearch : undefined,
    name: isNameSearch ? debouncedSearch : undefined,
  });

  // Live autocomplete query for phone (faster, on current search value)
  const [liveSearch, setLiveSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setLiveSearch(search), 150);
    return () => clearTimeout(timer);
  }, [search]);

  const isLivePhone = liveSearch.length >= 2 && /^\d+$/.test(liveSearch);
  const { data: autocompleteData } = useListCustomers(
    { phone: isLivePhone ? liveSearch : undefined },
    { query: { enabled: isLivePhone } }
  );

  const suggestions = isLivePhone ? (autocompleteData?.customers ?? []) : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSuggestionClick = (customerId: number) => {
    setShowDropdown(false);
    setSearch('');
    setLocation(`/shop/customers/${customerId}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">العملاء</h1>
          <p className="text-muted-foreground mt-1">البحث وإدارة ملفات العملاء</p>
        </div>
        <CustomerCreateDialog />
      </div>

      {/* Search with autocomplete */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6 z-10 pointer-events-none" />
        <Input
          ref={inputRef}
          className="h-16 pl-4 pr-14 text-lg rounded-2xl bg-white shadow-lg border-0 focus-visible:ring-accent"
          placeholder="ابحث برقم الهاتف (مثال: 9988...) أو اسم العميل..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => search.length >= 2 && setShowDropdown(true)}
          dir="rtl"
        />

        {/* Phone autocomplete dropdown */}
        {showDropdown && isLivePhone && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full mt-2 right-0 left-0 bg-white rounded-2xl shadow-2xl border border-border/50 z-50 overflow-hidden"
          >
            {suggestions.map((c) => (
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
                <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.customers.map((customer) => (
            <Link key={customer.id} href={`/shop/customers/${customer.id}`}>
              <Card className="hover-elevate cursor-pointer border-0 shadow-md hover:shadow-xl transition-all rounded-2xl group">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <User className="w-6 h-6 text-primary group-hover:text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{customer.name}</h3>
                      <div className="text-muted-foreground flex items-center gap-1 mt-1 text-sm" dir="ltr">
                        <Phone className="w-3 h-3" />
                        <span className="font-mono tracking-wide">{customer.phone}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </Card>
            </Link>
          ))}

          {data?.customers.length === 0 && (
            <div className="col-span-full p-12 text-center text-muted-foreground bg-white rounded-2xl shadow-sm">
              <User className="w-12 h-12 mx-auto text-muted/50 mb-4" />
              <p className="text-lg">لا يوجد عملاء مطابقين للبحث</p>
              <CustomerCreateDialog
                trigger={<Button variant="link" className="mt-2 text-accent">إضافة كعميل جديد؟</Button>}
                initialPhone={isPhoneSearch ? search : ''}
              />
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

  // Sync initialPhone when it changes
  useEffect(() => { setPhone(initialPhone); }, [initialPhone]);

  const mutation = useCreateCustomer({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/customers'] });
        toast({ title: 'تمت إضافة العميل بنجاح' });
        setOpen(false);
        setPhone('');
        setLocation(`/shop/customers/${data.id}`);
      },
      onError: (err: any) => {
        toast({ title: 'خطأ', description: err?.message || 'رقم الهاتف مسجل مسبقاً', variant: 'destructive' });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (phone.length !== 8 || !/^\d{8}$/.test(phone)) {
      toast({ title: 'خطأ', description: 'رقم الهاتف يجب أن يكون 8 أرقام', variant: 'destructive' });
      return;
    }
    mutation.mutate({
      data: {
        name: fd.get('name') as string,
        phone,
        notes: fd.get('notes') as string,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-primary text-white hover:bg-primary/90 shadow-lg rounded-xl gap-2 h-12 px-6">
            <Plus className="w-5 h-5" /> إضافة عميل جديد
          </Button>
        )}
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">ملف عميل جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">اسم العميل</label>
            <Input
              name="name"
              required
              className="bg-muted/50 rounded-xl h-12"
              placeholder="الاسم الكامل"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">رقم الهاتف (8 أرقام)</label>
            <div className="relative">
              <Input
                name="phone"
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setPhone(v);
                }}
                required
                className="bg-muted/50 rounded-xl h-12 font-mono text-lg tracking-widest"
                dir="ltr"
                placeholder="99887766"
                maxLength={8}
                inputMode="numeric"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {phone.length}/8
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">ملاحظات (اختياري)</label>
            <Input name="notes" className="bg-muted/50 rounded-xl h-12" />
          </div>
          <Button
            type="submit"
            className="w-full h-14 rounded-xl text-lg font-bold mt-6"
            disabled={mutation.isPending || phone.length !== 8}
          >
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ ومتابعة للقياسات'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
