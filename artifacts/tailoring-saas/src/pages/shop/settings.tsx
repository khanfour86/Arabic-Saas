import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useListShopUsers, useCreateShopUser, useDeleteShopUser, useUpdateShopUser, useExportCustomers, useExportInvoices } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Download, Plus, Trash2, Loader2, Database, Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function ShopSettings() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إدارة المستخدمين والنسخ الاحتياطي</p>
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

  const deleteMutation = useDeleteShopUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/users'] });
        toast({ title: 'تم الحذف بنجاح' });
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
          <CardTitle className="text-xl">مستخدمي النظام</CardTitle>
        </div>
        <UserCreateDialog />
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="divide-y">
            {data?.users.map(u => (
              <div key={u.id} className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div>
                  <h4 className="font-bold text-lg">{u.name}</h4>
                  <div className="text-sm text-muted-foreground" dir="ltr">{u.username}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {u.role === 'shop_manager' ? 'مدير' : u.role === 'reception' ? 'استقبال' : 'خياط'}
                  </Badge>
                  <UserEditDialog user={u} />
                  {u.role !== 'shop_manager' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من الحذف؟')) deleteMutation.mutate({ userId: u.id });
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

function UserEditDialog({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(user.role);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useUpdateShopUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/users'] });
        toast({ title: 'تم تحديث بيانات المستخدم' });
        setOpen(false);
      },
      onError: () => toast({ title: 'خطأ في التحديث', variant: 'destructive' }),
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = { role };
    const name = fd.get('name') as string;
    const password = fd.get('password') as string;
    if (name) data.name = name;
    if (password) data.password = password;
    mutation.mutate({ userId: user.id, data });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setRole(user.role); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل: {user.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">الاسم الكامل</label>
            <Input name="name" defaultValue={user.name} required className="bg-muted/50 rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">اسم المستخدم</label>
            <Input value={user.username} disabled className="bg-muted/30 rounded-xl text-muted-foreground" dir="ltr" />
            <p className="text-xs text-muted-foreground">اسم المستخدم لا يمكن تغييره</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">كلمة المرور الجديدة</label>
            <Input name="password" type="password" className="bg-muted/50 rounded-xl" dir="ltr" placeholder="اتركها فارغة إذا لم تريد التغيير" />
          </div>
          {user.role !== 'shop_manager' && (
            <div className="space-y-2">
              <label className="text-sm font-bold">الصلاحية</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-muted/50 rounded-xl" dir="rtl"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="reception">استقبال</SelectItem>
                  <SelectItem value="tailor">خياط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full h-12 rounded-xl mt-4" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ التعديلات'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserCreateDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useCreateShopUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/shop/users'] });
        toast({ title: 'تم إضافة المستخدم' });
        setOpen(false);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      data: {
        name: fd.get('name') as string,
        username: fd.get('username') as string,
        password: fd.get('password') as string,
        role: fd.get('role') as any,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2 bg-primary text-white"><Plus className="w-4 h-4"/> إضافة مستخدم</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة مستخدم جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">الاسم الكامل</label>
            <Input name="name" required className="bg-muted/50 rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">اسم المستخدم (للدخول)</label>
            <Input name="username" required className="bg-muted/50 rounded-xl" dir="ltr" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">كلمة المرور</label>
            <Input name="password" type="password" required className="bg-muted/50 rounded-xl" dir="ltr" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">الصلاحية</label>
            <Select name="role" defaultValue="reception">
              <SelectTrigger className="bg-muted/50 rounded-xl" dir="rtl"><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="reception">استقبال</SelectItem>
                <SelectItem value="tailor">خياط</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl mt-4" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ'}
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
      toast({ title: 'تم تحميل ملف العملاء بنجاح' });
    } catch {
      toast({ title: 'خطأ في التصدير', variant: 'destructive' });
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
      toast({ title: 'تم تحميل ملف الفواتير بنجاح' });
    } catch {
      toast({ title: 'خطأ في التصدير', variant: 'destructive' });
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
          <h3 className="text-xl font-bold font-display mb-2">النسخ الاحتياطي والتصدير</h3>
          <p className="text-primary-foreground/70 text-sm">تنزيل بيانات محلك بصيغة Excel منظّمة.</p>
        </div>

        <div className="w-full space-y-3 pt-4 border-t border-white/10">
          <Button
            variant="secondary"
            className="w-full h-12 rounded-xl justify-between group"
            onClick={handleExportCustomers}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold">تصدير العملاء</span>}
            <Download className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
          </Button>
          <Button
            variant="secondary"
            className="w-full h-12 rounded-xl justify-between group"
            onClick={handleExportInvoices}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold">تصدير الفواتير</span>}
            <Download className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
