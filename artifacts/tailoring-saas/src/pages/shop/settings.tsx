import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useListShopUsers, useCreateShopUser, useDeleteShopUser, useUpdateShopUser, useExportCustomers, useExportInvoices } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Download, Plus, Trash2, Loader2, Database, Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const TAILOR_STAGES = [
  { key: 'cutting', labelKey: 'stageCutting' as const },
  { key: 'assembly', labelKey: 'stageAssembly' as const },
  { key: 'finishing', labelKey: 'stageFinishing' as const },
  { key: 'ironing', labelKey: 'stageIroning' as const },
];

function StageBadge({ stage, t }: { stage: string; t: (k: any) => string }) {
  const map: Record<string, string> = {
    cutting: t('stageCutting'),
    assembly: t('stageAssembly'),
    finishing: t('stageFinishing'),
    ironing: t('stageIroning'),
  };
  const colors: Record<string, string> = {
    cutting: 'bg-blue-100 text-blue-700',
    assembly: 'bg-purple-100 text-purple-700',
    finishing: 'bg-amber-100 text-amber-700',
    ironing: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${colors[stage] ?? 'bg-muted text-muted-foreground'}`}>
      {map[stage] ?? stage}
    </span>
  );
}

export function ShopSettings() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">{t('settingsTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('settingsSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UsersSection />
        </div>
        <div>
          <ExportSection />
        </div>
      </div>
    </div>
  );
}

function UsersSection() {
  const { data, isLoading } = useListShopUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const deleteMutation = useDeleteShopUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/users'] });
        toast({ title: t('deletedSuccess') });
      }
    }
  });

  return (
    <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
      <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <CardTitle className="text-xl">{t('systemUsers')}</CardTitle>
        </div>
        <UserCreateDialog />
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="divide-y">
            {data?.users.map((u: any) => (
              <div key={u.id} className="p-5 flex items-start justify-between hover:bg-muted/30 transition-colors gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-lg">{u.name}</h4>
                  <div className="text-sm text-muted-foreground" dir="ltr">{u.username}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {u.role === 'shop_manager' ? t('roleBadgeManager') : u.role === 'reception' ? t('roleBadgeReception') : t('roleBadgeTailor')}
                    </Badge>
                    {u.role === 'tailor' && Array.isArray(u.tailorRoles) && u.tailorRoles.map((r: string) => (
                      <StageBadge key={r} stage={r} t={t} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <UserEditDialog user={u} />
                  {u.role !== 'shop_manager' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(t('confirmDelete'))) deleteMutation.mutate({ userId: u.id });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TailorRolesCheckboxes({ selected, onChange, t }: {
  selected: string[];
  onChange: (roles: string[]) => void;
  t: (k: any) => string;
}) {
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter(r => r !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold">{t('tailorRolesLabel')}</label>
      <p className="text-xs text-muted-foreground">{t('tailorRolesHint')}</p>
      <div className="grid grid-cols-2 gap-2">
        {TAILOR_STAGES.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all text-start ${
              selected.includes(key)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
            }`}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
              selected.includes(key) ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {selected.includes(key) && (
                <svg viewBox="0 0 10 8" className="w-3 h-3 fill-white">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserEditDialog({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<'reception' | 'tailor'>(user.role === 'tailor' ? 'tailor' : 'reception');
  const [tailorRoles, setTailorRoles] = useState<string[]>(Array.isArray(user.tailorRoles) ? user.tailorRoles : []);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, dir } = useTranslation();

  const mutation = useUpdateShopUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/users'] });
        toast({ title: t('userDataUpdated') });
        setOpen(false);
      },
      onError: () => toast({ title: t('updateErrorSettings'), variant: 'destructive' }),
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const password = fd.get('password') as string;

    if (password && password.length < 6) {
      toast({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }

    if (job === 'tailor' && tailorRoles.length === 0) {
      toast({ title: t('mustSelectRole'), variant: 'destructive' });
      return;
    }

    const data: any = { role: job };
    if (name) data.name = name;
    if (password) data.password = password;
    if (job === 'tailor') data.tailorRoles = tailorRoles;
    else data.tailorRoles = [];

    mutation.mutate({ userId: user.id, data });
  };

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) {
      setJob(user.role === 'tailor' ? 'tailor' : 'reception');
      setTailorRoles(Array.isArray(user.tailorRoles) ? user.tailorRoles : []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent dir={dir} className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editUserTitle')} {user.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('fullNameLabel')}</label>
            <Input name="name" defaultValue={user.name} required className="bg-muted/50 rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('usernameLabel')}</label>
            <Input value={user.username} disabled className="bg-muted/30 rounded-xl text-muted-foreground" dir="ltr" />
            <p className="text-xs text-muted-foreground">{t('usernameCannotChange')}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('newPasswordLabel')}</label>
            <Input name="password" type="password" className="bg-muted/50 rounded-xl" dir="ltr" placeholder={t('leaveEmpty')} />
          </div>
          {user.role !== 'shop_manager' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-bold">{t('jobLabel')}</label>
                <Select value={job} onValueChange={(v) => setJob(v as any)}>
                  <SelectTrigger className="bg-muted/50 rounded-xl" dir={dir}><SelectValue /></SelectTrigger>
                  <SelectContent dir={dir}>
                    <SelectItem value="reception">{t('jobReception')}</SelectItem>
                    <SelectItem value="tailor">{t('jobTailor')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {job === 'tailor' && (
                <TailorRolesCheckboxes selected={tailorRoles} onChange={setTailorRoles} t={t} />
              )}
            </>
          )}
          <Button type="submit" className="w-full h-12 rounded-xl mt-4" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('saveChanges')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserCreateDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [job, setJob] = useState<'reception' | 'tailor'>('reception');
  const [tailorRoles, setTailorRoles] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, dir } = useTranslation();
  const mutation = useCreateShopUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/users'] });
        toast({ title: t('userAdded') });
        setOpen(false);
      },
      onError: (err: any) => {
        const msg = err?.data?.error ?? err?.message ?? 'خطأ';
        toast({ title: msg, variant: 'destructive' });
      },
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (job === 'tailor' && tailorRoles.length === 0) {
      toast({ title: t('mustSelectRole'), variant: 'destructive' });
      return;
    }

    mutation.mutate({
      data: {
        name: fd.get('name') as string,
        username: fd.get('username') as string,
        password,
        role: job as any,
        tailorRoles: job === 'tailor' ? tailorRoles as any : undefined,
      }
    });
  };

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setPassword('');
      setJob('reception');
      setTailorRoles([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2 bg-primary text-white"><Plus className="w-4 h-4"/> {t('addUser')}</Button>
      </DialogTrigger>
      <DialogContent dir={dir} className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('addNewUser')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('fullNameLabel')}</label>
            <Input name="name" required className="bg-muted/50 rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('usernameForLogin')}</label>
            <Input name="username" required className="bg-muted/50 rounded-xl" dir="ltr" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('passwordLabel')}</label>
            <Input
              name="password"
              type="password"
              required
              className="bg-muted/50 rounded-xl"
              dir="ltr"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <p className={`text-xs ${password.length > 0 && password.length < 6 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {t('minPassword')}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">{t('jobLabel')}</label>
            <Select value={job} onValueChange={(v) => { setJob(v as any); setTailorRoles([]); }}>
              <SelectTrigger className="bg-muted/50 rounded-xl" dir={dir}><SelectValue /></SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="reception">{t('jobReception')}</SelectItem>
                <SelectItem value="tailor">{t('jobTailor')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {job === 'tailor' && (
            <TailorRolesCheckboxes selected={tailorRoles} onChange={setTailorRoles} t={t} />
          )}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl mt-4"
            disabled={mutation.isPending || password.length < 6 || (job === 'tailor' && tailorRoles.length === 0)}
          >
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('saveBtn')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExportSection() {
  const { refetch: exportC } = useExportCustomers({ query: { enabled: false } });
  const { refetch: exportI } = useExportInvoices({ query: { enabled: false } });
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const downloadExcel = (wb: XLSX.WorkBook, filename: string) => {
    XLSX.writeFile(wb, filename);
  };

  const handleExportCustomers = async () => {
    setLoading(true);
    try {
      const res = await exportC();
      if (!res.data) throw new Error();
      const customers = res.data.data as any[];

      const rows = customers.map(c => ({
        'الاسم': c.name,
        'الهاتف': c.phone,
        'تاريخ الإضافة': c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-KW') : '',
        'عدد الملفات': c.profiles?.length ?? 0,
        'ملاحظات': c.notes ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
      ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 14 }, { wch: 30 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
      downloadExcel(wb, `عملاء_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: t('customersDownloaded') });
    } catch {
      toast({ title: t('exportError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportInvoices = async () => {
    setLoading(true);
    try {
      const res = await exportI();
      if (!res.data) throw new Error();
      const invoices = res.data.data as any[];

      const invRows = invoices.map(inv => ({
        'رقم الفاتورة': inv.invoiceNumber,
        'العميل': inv.customerName ?? '',
        'الهاتف': inv.customerPhone ?? '',
        'الإجمالي (د.ك)': Number(inv.totalAmount ?? 0).toFixed(3),
        'المدفوع (د.ك)': Number(inv.paidAmount ?? 0).toFixed(3),
        'المتبقي (د.ك)': Number(inv.remainingAmount ?? 0).toFixed(3),
        'الحالة': inv.status === 'pending' ? 'تحت الخياطة' : inv.status === 'ready' ? 'جاهز' : 'تم التسليم',
        'التاريخ': inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ar-KW') : '',
      }));

      const wsInv = XLSX.utils.json_to_sheet(invRows);
      wsInv['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];

      const subRows = invoices.flatMap(inv =>
        (inv.subOrders ?? []).map((so: any) => ({
          'رقم الفاتورة': inv.invoiceNumber,
          'رقم الطلب': so.subOrderNumber,
          'الشخص': so.profileName ?? '',
          'الكمية': so.quantity,
          'مصدر القماش': so.fabricSource === 'shop_fabric' ? 'قماش المحل' : 'قماش العميل',
          'تفاصيل القماش': so.fabricDescription ?? '',
          'السعر (د.ك)': Number(so.price ?? 0).toFixed(3),
          'المدفوع (د.ك)': Number(so.paidAmount ?? 0).toFixed(3),
          'الحالة': so.status === 'ready' ? 'جاهز' : 'تحت الخياطة',
        }))
      );

      const wsSub = XLSX.utils.json_to_sheet(subRows);
      wsSub['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsInv, 'الفواتير');
      XLSX.utils.book_append_sheet(wb, wsSub, 'تفاصيل الطلبات');
      downloadExcel(wb, `فواتير_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: t('invoicesDownloaded') });
    } catch {
      toast({ title: t('exportError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-primary text-primary-foreground">
      <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
          <Database className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold font-display mb-2">{t('backupExport')}</h3>
          <p className="text-primary-foreground/70 text-sm">{t('backupDesc')}</p>
        </div>

        <div className="w-full space-y-3 pt-4 border-t border-white/10">
          <Button
            variant="secondary"
            className="w-full h-12 rounded-xl justify-between group"
            onClick={handleExportCustomers}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold">{t('exportCustomers')}</span>}
            <Download className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
          </Button>
          <Button
            variant="secondary"
            className="w-full h-12 rounded-xl justify-between group"
            onClick={handleExportInvoices}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold">{t('exportInvoices')}</span>}
            <Download className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
