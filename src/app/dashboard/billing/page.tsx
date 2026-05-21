'use client';

import React, { useState, useEffect } from 'react';
import { Check, Zap, Building2, Crown, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { subscriptionService, PLAN_PRICES } from '@/lib/services/subscriptionService';
import type { PlanType, BillingInterval, Subscription } from '@/lib/services/subscriptionService';

const PLAN_CONFIG = [
  {
    id: 'starter' as PlanType,
    name: 'Starter',
    icon: Zap,
    color: '#64748b',
    description: 'Für Einzelkämpfer & Freelancer',
    features: [
      '1 Benutzer (nur Inhaber)',
      '1 fester Upload-Link',
      '10 GB Gesamtspeicher',
      'Max. 20 MB pro Datei',
      'Standard-Branding (Logo)',
      'E-Mail-Benachrichtigungen',
      'DSGVO-konform',
    ],
    notIncluded: ['Eigene Upload-Domain', 'Bis zu 5 Teammitglieder', 'Priorisierter Support'],
    highlight: false,
  },
  {
    id: 'kanzlei' as PlanType,
    name: 'Kanzlei',
    icon: Building2,
    color: '#1a56db',
    description: 'Für Kanzleien & kleine Teams',
    features: [
      'Bis zu 5 Teammitglieder',
      'Je eigener Upload-Link pro Nutzer',
      '50 GB Gesamtspeicher',
      'Max. 100 MB pro Datei',
      'Eigene Upload-Domain',
      'Auto-Löschung nach 14 Tagen',
      'E-Mail-Benachrichtigungen',
      'DSGVO-konform',
    ],
    notIncluded: ['Unbegrenzte Nutzer', 'Priorisierter Support'],
    highlight: true,
  },
  {
    id: 'premium' as PlanType,
    name: 'Premium',
    icon: Crown,
    color: '#7c3aed',
    description: 'Für größere Unternehmen',
    features: [
      'Unbegrenzte Teammitglieder',
      'Unbegrenzte Upload-Links',
      '250 GB Gesamtspeicher',
      'Unbegrenzte Dateigröße',
      'Eigene Upload-Domain',
      'Auto-Löschung nach 14 Tagen',
      'E-Mail-Benachrichtigungen',
      'Priorisierter deutscher Support',
      'DSGVO-konform',
    ],
    notIncluded: [],
    highlight: false,
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setSuccessMsg('Ihr Abonnement wurde erfolgreich aktiviert!');
    }
    if (params.get('canceled') === 'true') {
      setErrorMsg('Checkout abgebrochen. Kein Betrag wurde belastet.');
    }
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const sub = await subscriptionService.getSubscription();
      setSubscription(sub);
    } catch {
      // no sub
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: PlanType) => {
    const key = `${plan}-${billingInterval}`;
    setCheckoutLoading(key);
    setErrorMsg(null);
    try {
      const result = await subscriptionService.createCheckoutSession(plan, billingInterval, false);
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const currentPlan = subscription?.plan ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Abonnement & Abrechnung</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wählen Sie den passenden Plan für Ihre Anforderungen.
        </p>
      </div>

      {/* Current plan banner */}
      {subscription && (
        <div className="mb-6 bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-primary mb-0.5">Aktueller Plan</p>
            <p className="text-sm font-bold text-foreground capitalize">
              {subscription.plan} · {subscription.billingInterval === 'monthly' ? 'Monatlich' : 'Jährlich'}
            </p>
            {subscription.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Verlängert am {new Date(subscription.currentPeriodEnd).toLocaleDateString('de-DE')}
              </p>
            )}
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
            Aktiv
          </span>
        </div>
      )}

      {/* Success/Error messages */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-accent flex-shrink-0" />
          <p className="text-sm text-foreground">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-3 bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <p className="text-sm text-foreground">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLAN_CONFIG.map((plan) => {
          const price =
            billingInterval === 'monthly'
              ? PLAN_PRICES[plan.id].monthly
              : PLAN_PRICES[plan.id].yearly;
          const isCurrentPlan = currentPlan === plan.id;
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
              } ${isCurrentPlan ? 'ring-2 ring-accent/40' : ''}`}
            >
              {plan.highlight && !isCurrentPlan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Beliebteste Wahl
                  </span>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
                    Ihr Plan
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
                  <p className="text-xs text-accent font-medium mb-1">
                    = €{Math.round(price / 12)}/Monat · 2 Monate gratis
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>

              <div className="p-6 flex-1">
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check size={14} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{f}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 opacity-40">
                      <X size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 pt-0">
                {isCurrentPlan ? (
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border border-accent/30 text-accent bg-accent/5">
                    <CheckCircle2 size={14} />
                    Aktueller Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading || !!checkoutLoading}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      plan.highlight
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Weiterleitung...
                      </>
                    ) : (
                      `${plan.name} wählen`
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Alle Preise zzgl. MwSt. · Jederzeit zum Monatsende kündbar · Keine Mindestlaufzeit
      </p>
    </div>
  );
}
