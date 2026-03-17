import React, { useState, useRef, useEffect } from 'react';
import { toEnglishDigits } from '@/lib/digits';
import { useGetCustomer, useCreateProfile, useUpsertMeasurements, useUpdateCustomer, useUpdateProfile } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Phone, Plus, Loader2, FilePlus, Save, Ruler, StickyNote, Scissors, Pencil, X, Check } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

function InlineEdit({ value, onSave, isPending }: { value: string; onSave: (v: string) => void; isPending: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) { setEditing(false); setDraft(value); return; }
    onSave(trimmed);
    setEditing(false);
  };

  const cancel = () => { setEditing(false); setDraft(value); };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group/edit flex items-center gap-2 text-right hover:opacity-80 transition-opacity"
        title="انقر للتعديل"
      >
        <span>{value}</span>
        <Pencil className="w-3.5 h-3.5 opacity-0 group-hover/edit:opacity-60 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        className="h-9 text-lg font-bold bg-white/20 border-white/30 text-inherit placeholder:text-inherit/50 rounded-lg min-w-0 w-48"
        disabled={isPending}
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 text-inherit hover:bg-white/20 rounded-lg" onClick={commit} disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-inherit hover:bg-white/20 rounded-lg" onClick={cancel} disabled={isPending}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

function InlineEditDark({ value, onSave, isPending }: { value: string; onSave: (v: string) => void; isPending: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) { setEditing(false); setDraft(value); return; }
    onSave(trimmed);
    setEditing(false);
  };

  const cancel = () => { setEditing(false); setDraft(value); };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group/edit flex items-center gap-2 text-right hover:opacity-80 transition-opacity"
        title="انقر للتعديل"
      >
        <span>{value}</span>
        <Pencil className="w-3.5 h-3.5 opacity-0 group-hover/edit:opacity-50 transition-opacity shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        className="h-9 font-bold bg-muted/50 rounded-lg min-w-0 w-44"
        disabled={isPending}
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={commit} disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg" onClick={cancel} disabled={isPending}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function CustomerDetail() {
  const params = useParams();
  const customerId = parseInt(params.id || '0');
  const { data: customer, isLoading } = useGetCustomer(customerId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canEdit = user?.role === 'shop_manager' || user?.role === 'reception';

  const updateCustomerMutation = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}`] });
        toast({ title: 'تم تحديث اسم العميل' });
      },
      onError: () => toast({ title: 'خطأ في التحديث', variant: 'destructive' }),
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!customer) return <div>لم يتم العثور على العميل</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <Card className="border-0 shadow-xl rounded-2xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground relative overflow-hidden">
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg border border-white/20">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              {canEdit ? (
                <div className="text-3xl font-display font-bold mb-2">
                  <InlineEdit
                    value={customer.name}
                    isPending={updateCustomerMutation.isPending}
                    onSave={(name) => updateCustomerMutation.mutate({ customerId, data: { name } })}
                  />
                </div>
              ) : (
                <h1 className="text-3xl font-display font-bold mb-2">{customer.name}</h1>
              )}
              <div className="flex items-center gap-4 text-primary-foreground/80">
                <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg">
                  <Phone className="w-4 h-4" />
                  <span dir="ltr">{customer.phone}</span>
                </div>
              </div>
            </div>
          </div>
          <Link href={`/shop/invoices/new?customerId=${customer.id}`}>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 rounded-xl h-14 px-8 text-lg font-bold gap-2 hover:-translate-y-1 transition-all w-full md:w-auto">
              <FilePlus className="w-6 h-6" /> فاتورة جديدة
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
          <div className="w-2 h-6 bg-accent rounded-full" />
          ملفات القياس ({customer.profiles.length})
        </h2>
        <ProfileCreateDialog customerId={customer.id} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customer.profiles.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            customerId={customer.id}
            canEdit={canEdit}
          />
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ profile, customerId, canEdit }: { profile: any; customerId: number; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateProfileMutation = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}`] });
        toast({ title: 'تم تحديث اسم الملف' });
      },
      onError: () => toast({ title: 'خطأ في التحديث', variant: 'destructive' }),
    }
  });

  const m = profile.measurements;

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden group hover:shadow-xl transition-all">
      <div className={`h-2 w-full ${profile.isMain ? 'bg-accent' : 'bg-primary/20'}`} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap">
              {canEdit ? (
                <InlineEditDark
                  value={profile.name}
                  isPending={updateProfileMutation.isPending}
                  onSave={(name) => updateProfileMutation.mutate({ profileId: profile.id, data: { name } })}
                />
              ) : (
                <span>{profile.name}</span>
              )}
              {profile.isMain && (
                <span className="text-[10px] bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">رئيسي</span>
              )}
            </div>
            {profile.notes && <p className="text-sm text-muted-foreground mt-1">{profile.notes}</p>}
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-4 mb-4 space-y-4">
          {m ? (
            <>
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {[
                  { label: 'الطول', value: m.length },
                  { label: 'الكتف', value: m.shoulder },
                  { label: 'الصدر', value: m.chest },
                  { label: 'الكم',   value: m.sleeve },
                  { label: 'الياقة', value: m.neck },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white p-2 rounded-lg shadow-sm">
                    <div className="text-muted-foreground text-xs mb-1">{label}</div>
                    <div className="font-bold text-primary">{value ?? '-'}</div>
                  </div>
                ))}
              </div>

              {m.modelNotes && (
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex gap-2 items-start">
                  <Scissors className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-accent-foreground mb-0.5">ملاحظات الموديل</div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{m.modelNotes}</p>
                  </div>
                </div>
              )}

              {m.generalNotes && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 items-start">
                  <StickyNote className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-blue-600 mb-0.5">ملاحظات عامة</div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{m.generalNotes}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground flex flex-col items-center gap-2">
              <Ruler className="w-6 h-6 opacity-50" />
              لا توجد قياسات مسجلة
            </div>
          )}
        </div>

        <MeasurementsDialog profile={profile} customerId={customerId} />
      </CardContent>
    </Card>
  );
}

function ProfileCreateDialog({ customerId }: { customerId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useCreateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}`] });
        toast({ title: 'تم إضافة الملف بنجاح' });
        setOpen(false);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({ data: { customerId, name: fd.get('name') as string, isMain: false } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-2 font-bold bg-white shadow-sm border-primary/20 text-primary">
          <Plus className="w-4 h-4" /> إضافة شخص آخر
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة ملف قياسات جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">اسم الشخص (مثال: الابن أحمد)</label>
            <Input name="name" required className="bg-muted/50 rounded-xl" />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MeasurementsDialog({ profile, customerId }: { profile: any; customerId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useUpsertMeasurements({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/shop/customers/${customerId}`] });
        toast({ title: 'تم حفظ القياسات بنجاح' });
        setOpen(false);
      },
      onError: (err: any) => {
        toast({ title: 'خطأ في الحفظ', description: err?.message || 'حدث خطأ غير متوقع', variant: 'destructive' });
      }
    }
  });

  const m = profile.measurements || {};

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      profileId: profile.id,
      data: {
        length:       fd.get('length')   ? Number(fd.get('length'))   : null,
        shoulder:     fd.get('shoulder') ? Number(fd.get('shoulder')) : null,
        chest:        fd.get('chest')    ? Number(fd.get('chest'))    : null,
        sleeve:       fd.get('sleeve')   ? Number(fd.get('sleeve'))   : null,
        neck:         fd.get('neck')     ? Number(fd.get('neck'))     : null,
        modelNotes:   fd.get('modelNotes')   as string,
        generalNotes: fd.get('generalNotes') as string,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full rounded-xl gap-2 hover:bg-primary hover:text-white transition-colors">
          <Ruler className="w-4 h-4" /> تحديث القياسات
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary border-b pb-4">قياسات: {profile.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'الطول',  name: 'length' },
              { label: 'الكتف',  name: 'shoulder' },
              { label: 'الصدر',  name: 'chest' },
              { label: 'الكم',   name: 'sleeve' },
              { label: 'الياقة', name: 'neck' },
            ].map(({ label, name }) => (
              <div key={name} className="space-y-2">
                <label className="text-sm font-bold text-primary">{label}</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  name={name}
                  defaultValue={(m as any)[name] || ''}
                  onInput={(e) => {
                    const t = e.target as HTMLInputElement;
                    t.value = toEnglishDigits(t.value);
                  }}
                  className="h-12 text-lg text-center font-bold bg-muted/50 rounded-xl"
                />
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <label className="text-sm font-bold">ملاحظات الموديل (القصة، الأزرار، إلخ)</label>
              <Textarea name="modelNotes" defaultValue={m.modelNotes || ''} className="min-h-24 bg-muted/50 rounded-xl resize-none" placeholder="تفاصيل الخياطة والموديل..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">ملاحظات عامة</label>
              <Textarea name="generalNotes" defaultValue={m.generalNotes || ''} className="bg-muted/50 rounded-xl resize-none" />
            </div>
          </div>

          <Button type="submit" className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 ml-2" /> حفظ القياسات</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
