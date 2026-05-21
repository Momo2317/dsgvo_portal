'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Zap, Building2, Crown, Loader2, ArrowRight, Shield, LogOut } from 'lucide-react';
import { subscriptionService, PLAN_PRICES } from '@/lib/services/subscriptionService';
import type { PlanType, BillingInterval } from '@/lib/services/subscriptionService';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';

const PLAN_CONFIG = [
  {
    id: 'starter' as PlanType,
    name: 'Starter',
    icon: Zap,
    color: '#64748b',
    description: 'Für Einzelkämpfer & Freelancer',
    features: [
      { text: '1 Benutzer (nur Inhaber)', included: true },
      { text: '1 fester Upload-Link', included: true },
      { text: '10 GB Gesamtspeicher', included: true },
      { text: 'Max. 20 MB pro Datei', included: true },
      { text: 'Standard-Branding (Logo)', included: true },
      { text: 'E-Mail-Benachrichtigungen', included: true },
      { text: 'DSGVO-konform', included: true },
      { text: 'Eigene Upload-Domain', included: false },
      { text: 'Bis zu 5 Teammitglieder', included: false },
      { text: 'Priorisierter Support', included: false },
    ],
    cta: 'Starter wählen',
    highlight: false,
  },
  {
    id: 'kanzlei' as PlanType,
    name: 'Kanzlei',
    icon: Building2,
    color: '#1a56db',
    description: 'Für Kanzleien & kleine Teams',
    features: [
      { text: 'Bis zu 5 Teammitglieder', included: true },
      { text: 'Je eigener Upload-Link pro Nutzer', included: true },
      { text: '50 GB Gesamtspeicher', included: true },
      { text: 'Max. 100 MB pro Datei', included: true },
      { text: 'Eigene Upload-Domain', included: true },
      { text: 'Auto-Löschung nach 14 Tagen', included: true },
      { text: 'E-Mail-Benachrichtigungen', included: true },
      { text: 'DSGVO-konform', included: true },
      { text: 'Unbegrenzte Nutzer', included: false },
      { text: 'Priorisierter Support', included: false },
    ],
    cta: 'Kanzlei wählen',
    highlight: true,
  },
  {
    id: 'premium' as PlanType,
    name: 'Premium',
    icon: Crown,
    color: '#7c3aed',
    description: 'Für größere Unternehmen',
    features: [
      { text: 'Unbegrenzte Teammitglieder', included: true },
      { text: 'Unbegrenzte Upload-Links', included: true },
      { text: '250 GB Gesamtspeicher', included: true },
      { text: 'Unbegrenzte Dateigröße', included: true },
      { text: 'Eigene Upload-Domain', included: true },
      { text: 'Auto-Löschung nach 14 Tagen', included: true },
      { text: 'E-Mail-Benachrichtigungen', included: true },
      { text: 'Priorisierter deutscher Support', included: true },
      { text: 'DSGVO-konform', included: true },
    ],
    cta: 'Premium wählen',
    highlight: false,
  },
];

export default function ChoosePlanPage() {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-up-login-screen');
        return;
      }
      setUserEmail(user.email ?? '');

      // If already subscribed, go to dashboard
      const sub = await subscriptionService.getSubscription();
      if (sub) {
        router.push('/dashboard');
        return;
      }
      setCheckingSubscription(false);
    };
    init();
  }, [router]);

  const handleSubscribe = async (plan: PlanType) => {
    const key = `${plan}-${billingInterval}`;
    setCheckoutLoading(key);
    setErrorMsg(null);
    try {
      const result = await subscriptionService.createCheckoutSession(plan, billingInterval, true);
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout fehlgeschlagen. Bitte erneut versuchen.');
      setCheckoutLoading(null);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/sign-up-login-screen');
  };

  if (checkingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} />
            <span className="font-bold text-base text-foreground">TresorLink</span>
          </div>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-xs text-muted-foreground hidden sm:block">{userEmail}</span>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut size={14} />
              Abmelden
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-primary/20">
            <Shield size={12} />
            Konto erfolgreich erstellt
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Wählen Sie Ihren Plan
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
            Um TresorLink nutzen zu können, wählen Sie bitte einen Abonnementplan.
            Sie werden nach der Zahlung sofort freigeschaltet.
          </p>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-xl p-1">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                billingInterval === 'monthly' ?'bg-primary text-primary-foreground' :'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                billingInterval === 'yearly' ?'bg-primary text-primary-foreground' :'text-muted-foreground hover:text-foreground'
              }`}
            >
              Jährlich
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                  billingInterval === 'yearly' ?'bg-white/20 text-white' :'bg-primary/10 text-primary'
                }`}
              >
                2 Monate gratis
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLAN_CONFIG.map((plan) => {
            const price =
              billingInterval === 'monthly'
                ? PLAN_PRICES[plan.id].monthly
                : PLAN_PRICES[plan.id].yearly;
            const loadingKey = `${plan.id}-${billingInterval}`;
            const isLoading = checkoutLoading === loadingKey;
            const PlanIcon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative bg-card rounded-2xl border flex flex-col ${
                  plan.highlight
                    ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20'
                    : 'border-border'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Beliebteste Wahl
                    </span>
                  </div>
                )}

                <div className="p-6 border-b border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${plan.color}1a` }}
                    >
                      <PlanIcon size={14} style={{ color: plan.color }} />
                    </div>
                    <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  </div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-black text-foreground">€{price}</span>
                    <span className="text-sm text-muted-foreground mb-1.5">
                      /{billingInterval === 'monthly' ? 'Monat' : 'Jahr'}
                    </span>
                  </div>
                  {billingInterval === 'yearly' && (
                    <p className="text-xs text-green-600 font-medium mb-1">
                      = €{Math.round(price / 12)}/Monat · 2 Monate gratis
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>

                <div className="p-6 flex-1">
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature.text} className="flex items-start gap-2.5">
                        {feature.included ? (
                          <Check size={14} className="text-primary flex-shrink-0 mt-0.5" />
                        ) : (
                          <X size={14} className="text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included ? 'text-foreground' : 'text-muted-foreground/50'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={!!checkoutLoading}
                    className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      plan.highlight
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Weiterleitung zu Stripe...
                      </>
                    ) : (
                      <>
                        {plan.cta}
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Alle Preise zzgl. MwSt. · Jederzeit zum Monatsende kündbar · Keine Mindestlaufzeit
        </p>
      </div>
    </div>
  );
}
