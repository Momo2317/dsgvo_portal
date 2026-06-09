'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
} from 'lucide-react';

interface InviteDetails {
  email: string;
  company: string;
  inviterName: string;
  portalName: string | null;
  alreadyRegistered: boolean;
}

interface RegisterForm {
  name: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export default function TeamInvitePage({ token }: { token: string }) {
  const router = useRouter();
  const { signUp, signIn } = useAuth();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterForm>({
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/team-invite/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Einladung ungültig');
          return;
        }
        setInvite(data);
      } catch {
        setError('Einladung konnte nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const onSubmit = async (data: RegisterForm) => {
    if (!invite) return;
    if (data.password !== data.confirmPassword) {
      form.setError('confirmPassword', { message: 'Passwörter stimmen nicht überein' });
      return;
    }

    setSubmitting(true);
    try {
      await signUp(invite.email, data.password, {
        fullName: data.name.trim(),
        company: invite.company,
      });
      await signIn(invite.email, data.password, true);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ full_name: data.name.trim(), company: invite.company })
          .eq('id', user.id);
        await supabase.rpc('link_team_invites_for_user');
      }

      toast.success('Willkommen im Team!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      form.setError('password', {
        message: err?.message || 'Registrierung fehlgeschlagen',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center ui-card-padded">
          <p className="text-danger font-medium mb-4">{error || 'Einladung ungültig'}</p>
          <Link href="/sign-up-login-screen" className="text-primary text-sm font-semibold hover:underline">
            Zur Anmeldeseite
          </Link>
        </div>
      </div>
    );
  }

  if (invite.alreadyRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full ui-card-padded">
          <div className="flex items-center gap-3 mb-4">
            <AppLogo size={40} />
            <div>
              <p className="font-bold text-foreground">Team-Einladung</p>
              <p className="text-sm text-muted-foreground">von {invite.inviterName}</p>
            </div>
          </div>
          <p className="text-sm text-foreground mb-4">
            Für <strong>{invite.email}</strong> existiert bereits ein Konto. Melden Sie sich an, um
            die Einladung anzunehmen.
          </p>
          <Link
            href={`/sign-up-login-screen?email=${encodeURIComponent(invite.email)}&next=/dashboard`}
            className="ui-btn-primary w-full"
          >
            Anmelden
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AppLogo size={48} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Team-Einladung</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{invite.inviterName}</strong> hat Sie eingeladen
            {invite.portalName ? ` · Portal: ${invite.portalName}` : ''}
          </p>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="ui-card-padded space-y-4"
        >
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Vollständiger Name
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                className="ui-input pl-9"
                placeholder="Vor- und Nachname"
                {...form.register('name', { required: 'Name ist erforderlich', minLength: 2 })}
              />
            </div>
            {form.formState.errors.name && (
              <p className="text-xs text-danger mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              E-Mail-Adresse
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                readOnly
                value={invite.email}
                className="ui-input-readonly pl-9"
              />
              <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Unternehmen
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                readOnly
                value={invite.company}
                className="ui-input-readonly pl-9"
              />
              <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Vom einladenden Konto übernommen und nicht änderbar.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Passwort
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="ui-input pl-9 pr-10"
                {...form.register('password', {
                  required: 'Passwort ist erforderlich',
                  minLength: { value: 8, message: 'Mindestens 8 Zeichen' },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-danger mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Passwort bestätigen
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="ui-input pl-9 pr-10"
                {...form.register('confirmPassword', { required: 'Bitte bestätigen' })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-danger mt-1">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-border"
              {...form.register('agreeTerms', { required: 'Bitte akzeptieren' })}
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Ich akzeptiere die Nutzungsbedingungen und Datenschutzerklärung.
            </span>
          </label>
          {form.formState.errors.agreeTerms && (
            <p className="text-xs text-danger">{form.formState.errors.agreeTerms.message}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="ui-btn-primary w-full"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Konto erstellen &amp; beitreten
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
          <Shield size={12} />
          DSGVO-konform · Verschlüsselte Übertragung
        </p>
      </div>
    </div>
  );
}
