'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createClient, ensureSessionRestored } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Mail,
  User,
  Building2,
  ArrowRight,
  CheckCircle2,
  Copy,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface RegisterFormData {
  name: string;
  company: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

const DEMO_ACCOUNTS = [
  {
    role: 'Steuerberater',
    email: 'mueller@stb-portal.de',
    password: 'Sicher2026!',
    name: 'Klaus Müller',
    company: 'Müller Steuerberatung GmbH',
  },
  {
    role: 'Rechtsanwalt',
    email: 'wagner@ra-kanzlei.de',
    password: 'Kanzlei2026!',
    name: 'Dr. Anna Wagner',
    company: 'Kanzlei Wagner & Partner',
  },
  {
    role: 'Makler',
    email: 'hoffmann@immobilien.de',
    password: 'Makler2026!',
    name: 'Thomas Hoffmann',
    company: 'Hoffmann Immobilien KG',
  },
];

const TRUST_FEATURES = [
  {
    icon: Shield,
    title: 'DSGVO-konform',
    desc: 'Vollständige Compliance nach EU-Datenschutzrecht',
  },
  {
    icon: Lock,
    title: 'Ende-zu-Ende verschlüsselt',
    desc: 'AES-256 Verschlüsselung für alle Dateien',
  },
  {
    icon: CheckCircle2,
    title: 'Automatische Löschung',
    desc: 'Dateien werden nach 14 Tagen automatisch gelöscht',
  },
];

async function resolvePostLoginPath(next: string | null): Promise<string> {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  const { subscriptionService } = await import('@/lib/services/subscriptionService');
  const sub = await subscriptionService.getSubscription();
  return sub ? '/dashboard' : '/choose-plan';
}

export default function AuthPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams?.get('next') ?? null;
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const loginForm = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  useEffect(() => {
    const checkExistingSession = async () => {
      await ensureSessionRestored();
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const destination = await resolvePostLoginPath(nextPath);
        router.replace(destination);
        return;
      }
      setCheckingSession(false);
    };
    if (!authLoading) {
      if (user) {
        resolvePostLoginPath(nextPath).then((destination) => router.replace(destination));
      } else {
        checkExistingSession();
      }
    }
  }, [authLoading, user, nextPath, router]);
  const registerForm = useForm<RegisterFormData>({
    defaultValues: {
      name: '',
      company: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDemoLogin = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    loginForm.setValue('email', account.email);
    loginForm.setValue('password', account.password);
    setActiveTab('login');
    toast.success(`Demo-Zugangsdaten für ${account.role} eingetragen`);
  };

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password, data.rememberMe);
      toast.success('Erfolgreich angemeldet. Willkommen zurück!');
      const destination = await resolvePostLoginPath(nextPath);
      router.push(destination);
      router.refresh();
    } catch (err: any) {
      loginForm.setError('email', {
        message: err?.message || 'Ungültige Zugangsdaten. Bitte erneut versuchen.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      registerForm.setError('confirmPassword', {
        message: 'Passwörter stimmen nicht überein',
      });
      return;
    }
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, {
        fullName: data.name,
        company: data.company,
      });
      toast.success('Konto erfolgreich erstellt! Bitte wählen Sie Ihren Plan.');
      // After sign-up, sign them in and redirect to plan selection
      await signIn(data.email, data.password, true);
      router.push('/choose-plan');
      router.refresh();
    } catch (err: any) {
      registerForm.setError('email', {
        message: err?.message || 'Registrierung fehlgeschlagen. Bitte erneut versuchen.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession || authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand & Trust */}
      <div className="hidden lg:flex lg:w-[520px] xl:w-[580px] flex-shrink-0 flex-col justify-between bg-primary p-10 xl:p-14 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-32 -translate-y-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-16 translate-y-16" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <AppLogo size={40} />
            <span className="text-white font-bold text-xl tracking-tight">
              TresorLink
            </span>
          </div>

          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-white/20">
              <Shield size={12} />
              EU-DSGVO Art. 25 konform
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Sichere Dateiübertragung für Profis
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              Ihr professionelles Upload-Portal. Keine Anmeldung für
              Ihre Kunden erforderlich — einfach den Link teilen und Dokumente
              sicher empfangen.
            </p>
          </div>

          <div className="space-y-5">
            {TRUST_FEATURES.map((feature) => (
              <div
                key={`trust-${feature.title}`}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {feature.title}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom compliance badges */}
        <div className="relative z-10">
          <p className="text-white/40 text-xs mb-4">
            Zertifiziert und geprüft nach:
          </p>
          <div className="flex flex-wrap gap-2">
            {['DSGVO', 'ISO 27001', 'BSI IT-Grundschutz', 'TLS 1.3'].map(
              (badge) => (
                <span
                  key={`badge-${badge}`}
                  className="text-xs font-medium text-white/70 bg-white/10 border border-white/20 px-2.5 py-1 rounded"
                >
                  {badge}
                </span>
              )
            )}
          </div>
          <p className="text-white/30 text-xs mt-6">
            © 2026 TresorLink GmbH · Server-Standort: Frankfurt (EU-Central-1)
          </p>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 bg-background overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <AppLogo size={36} />
          <span className="font-bold text-lg text-foreground">TresorLink</span>
        </div>

        <div className="w-full max-w-md">
          {/* Tab switcher */}
          <div className="flex bg-muted rounded-xl p-1 mb-8">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-card text-foreground shadow-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          {/* LOGIN FORM */}
          {activeTab === 'login' && (
            <div className="fade-in">
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-foreground">
                  Willkommen zurück
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Melden Sie sich an, um Ihr Upload-Portal zu verwalten
                </p>
              </div>

              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="email"
                      placeholder="name@kanzlei.de"
                      className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                        loginForm.formState.errors.email
                          ? 'border-danger' :'border-border'
                      }`}
                      {...loginForm.register('email', {
                        required: 'E-Mail-Adresse ist erforderlich',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Ungültige E-Mail-Adresse',
                        },
                      })}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-danger text-xs mt-1.5">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-foreground">
                      Passwort
                    </label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                    >
                      Passwort vergessen?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      className={`w-full pl-9 pr-10 py-2.5 text-sm border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                        loginForm.formState.errors.password
                          ? 'border-danger' :'border-border'
                      }`}
                      {...loginForm.register('password', {
                        required: 'Passwort ist erforderlich',
                        minLength: {
                          value: 8,
                          message: 'Passwort muss mindestens 8 Zeichen lang sein',
                        },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-danger text-xs mt-1.5">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                    {...loginForm.register('rememberMe')}
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Angemeldet bleiben
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Wird angemeldet...
                    </>
                  ) : (
                    <>
                      Anmelden
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* REGISTER FORM */}
          {activeTab === 'register' && (
            <div className="fade-in">
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-foreground">
                  Konto erstellen
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Richten Sie Ihr DSGVO-konformes Upload-Portal ein
                </p>
              </div>

              <form
                onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Vollständiger Name
                    </label>
                    <div className="relative">
                      <User
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="text"
                        placeholder="Dr. Max Mustermann"
                        className={`w-full pl-8 pr-3 py-2.5 text-sm border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                          registerForm.formState.errors.name
                            ? 'border-danger' :'border-border'
                        }`}
                        {...registerForm.register('name', {
                          required: 'Name ist erforderlich',
                        })}
                      />
                    </div>
                    {registerForm.formState.errors.name && (
                      <p className="text-danger text-xs mt-1">
                        {registerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Unternehmen / Kanzlei
                    </label>
                    <div className="relative">
                      <Building2
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="text"
                        placeholder="Mustermann GmbH"
                        className={`w-full pl-8 pr-3 py-2.5 text-sm border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                          registerForm.formState.errors.company
                            ? 'border-danger' :'border-border'
                        }`}
                        {...registerForm.register('company', {
                          required: 'Unternehmensname ist erforderlich',
                        })}
                      />
                    </div>
                    {registerForm.formState.errors.company && (
                      <p className="text-danger text-xs mt-1">
                        {registerForm.formState.errors.company.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="email"
                      placeholder="name@kanzlei.de"
                      className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                        registerForm.formState.errors.email
                          ? 'border-danger' :'border-border'
                      }`}
                      {...registerForm.register('email', {
                        required: 'E-Mail-Adresse ist erforderlich',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Ungültige E-Mail-Adresse',
                        },
                      })}
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-danger text-xs mt-1.5">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Passwort
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 Zeichen, Groß-/Kleinbuchstaben"
                      className={`w-full pl-9 pr-10 py-2.5 text-sm border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                        registerForm.formState.errors.password
                          ? 'border-danger' :'border-border'
                      }`}
                      {...registerForm.register('password', {
                        required: 'Passwort ist erforderlich',
                        minLength: {
                          value: 8,
                          message: 'Passwort muss mindestens 8 Zeichen lang sein',
                        },
                        pattern: {
                          value: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                          message:
                            'Passwort muss Groß-/Kleinbuchstaben und Zahlen enthalten',
                        },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-danger text-xs mt-1.5">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Passwort bestätigen
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Passwort wiederholen"
                      className={`w-full pl-9 pr-10 py-2.5 text-sm border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                        registerForm.formState.errors.confirmPassword
                          ? 'border-danger' :'border-border'
                      }`}
                      {...registerForm.register('confirmPassword', {
                        required: 'Passwortbestätigung ist erforderlich',
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-danger text-xs mt-1.5">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary/30 flex-shrink-0"
                    {...registerForm.register('agreeTerms', {
                      required: 'Sie müssen den AGB zustimmen',
                    })}
                  />
                  <label
                    htmlFor="agreeTerms"
                    className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
                  >
                    Ich stimme den{' '}
                    <span className="text-primary underline cursor-pointer">
                      Allgemeinen Geschäftsbedingungen
                    </span>{' '}
                    und der{' '}
                    <span className="text-primary underline cursor-pointer">
                      Datenschutzerklärung
                    </span>{' '}
                    zu
                  </label>
                </div>
                {registerForm.formState.errors.agreeTerms && (
                  <p className="text-danger text-xs -mt-2">
                    {registerForm.formState.errors.agreeTerms.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Konto wird erstellt...
                    </>
                  ) : (
                    <>
                      Konto erstellen
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Demo Credentials */}
          <div className="mt-8 border border-border rounded-xl overflow-hidden">
            <div className="bg-muted px-4 py-3 flex items-center gap-2">
              <Shield size={14} className="text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Demo-Zugangsdaten zum Testen
              </span>
            </div>
            <div className="divide-y divide-border">
              {DEMO_ACCOUNTS.map((account) => (
                <div
                  key={`demo-${account.role}`}
                  className="px-4 py-3 flex items-center justify-between gap-3 bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {account.role}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {account.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(account.email, `email-${account.role}`)
                      }
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
                      title="E-Mail kopieren"
                    >
                      {copiedField === `email-${account.role}` ? (
                        <CheckCircle2 size={13} className="text-accent" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoLogin(account)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      Verwenden
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Server-Standort: Frankfurt, Deutschland · TLS 1.3 verschlüsselt
          </p>
        </div>
      </div>
    </div>
  );
}