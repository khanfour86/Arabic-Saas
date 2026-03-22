import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useLogin } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Scissors, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, lang, setLang, dir } = useTranslation();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast({ title: t('loginSuccess'), description: `${t('loginWelcome')} ${data.user.name}` });
        if (data.user.role === 'owner') setLocation('/owner/dashboard');
        else if (data.user.role === 'tailor') setLocation('/shop/tailor');
        else setLocation('/shop/dashboard');
      },
      onError: () => {
        toast({ title: t('loginError'), description: t('loginErrorDesc'), variant: 'destructive' });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden" dir={dir}>
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Background"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-panel border-0 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8 md:p-12">
            {/* Language toggle */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20"
              >
                {t('language')}
              </button>
            </div>

            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 mb-6 hover-elevate">
                <Scissors className="w-10 h-10 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold text-primary mb-2">{t('loginTitle')}</h1>
              <p className="text-muted-foreground">{t('loginSubtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">{t('loginUsername')}</label>
                <Input
                  dir="ltr"
                  className="h-14 text-center bg-white/50 border-white/50 focus:border-accent focus:ring-accent rounded-xl"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">{t('loginPassword')}</label>
                <Input
                  type="password"
                  dir="ltr"
                  className="h-14 text-center bg-white/50 border-white/50 focus:border-accent focus:ring-accent rounded-xl"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:-translate-y-1"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : t('loginBtn')}
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
