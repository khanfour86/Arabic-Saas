import React, { useState } from 'react';
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
  
  // Simple debounce
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useListCustomers({ 
    phone: debouncedSearch && !isNaN(Number(debouncedSearch)) ? debouncedSearch : undefined,
    name: debouncedSearch && isNaN(Number(debouncedSearch)) ? debouncedSearch : undefined
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">العملاء</h1>
          <p className="text-muted-foreground mt-1">البحث وإدارة ملفات العملاء</p>
        </div>
        <CustomerCreateDialog />
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
        <Input 
          className="h-16 pl-4 pr-14 text-lg rounded-2xl bg-white shadow-lg border-0 focus-visible:ring-accent"
          placeholder="ابحث برقم الهاتف أو اسم العميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.customers.map(customer => (
            <Link key={customer.id} href={`/shop/customers/${customer.id}`}>
              <Card className="hover-elevate cursor-pointer border-0 shadow-md hover:shadow-xl transition-all rounded-2xl group">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <User className="w-6 h-6 text-primary group-hover:text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{customer.name}</h3>
                      <div className="text-muted-foreground flex items-center gap-1 mt-1 text-sm dir-ltr justify-end">
                        <span>{customer.phone}</span>
                        <Phone className="w-3 h-3" />
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
              <CustomerCreateDialog trigger={<Button variant="link" className="mt-2 text-accent">إضافة كعميل جديد؟</Button>} initialPhone={!isNaN(Number(search)) ? search : ''} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerCreateDialog({ trigger, initialPhone = '' }: { trigger?: React.ReactNode, initialPhone?: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const mutation = useCreateCustomer({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/customers'] });
        toast({ title: 'تمت إضافة العميل بنجاح' });
        setOpen(false);
        setLocation(`/shop/customers/${data.id}`);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      data: {
        name: fd.get('name') as string,
        phone: fd.get('phone') as string,
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
            <Input name="name" required className="bg-muted/50 rounded-xl h-12" placeholder="الاسم الكامل" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">رقم الهاتف</label>
            <Input name="phone" defaultValue={initialPhone} required className="bg-muted/50 rounded-xl h-12" dir="ltr" placeholder="رقم الموبايل" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">ملاحظات (اختياري)</label>
            <Input name="notes" className="bg-muted/50 rounded-xl h-12" />
          </div>
          <Button type="submit" className="w-full h-14 rounded-xl text-lg font-bold mt-6" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ ومتابعة للقياسات'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
