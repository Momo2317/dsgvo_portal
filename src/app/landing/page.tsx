'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Shield, Lock, CheckCircle2, Upload, Bell, Trash2, Globe, Zap, ArrowRight, Check, X, Star, Users, ChevronDown, Building2, Crown } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    monthlyPrice: 19,
    yearlyPrice: 190,
    description: 'Für Einzelkämpfer & Freelancer',
    color: '#64748b',
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
    id: 'kanzlei',
    name: 'Kanzlei',
    icon: Building2,
    monthlyPrice: 49,
    yearlyPrice: 490,
    description: 'Für Kanzleien & kleine Teams',
    color: '#1a56db',
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
    id: 'premium',
    name: 'Premium',
    icon: Crown,
    monthlyPrice: 99,
    yearlyPrice: 990,
    description: 'Für größere Unternehmen',
    color: '#7c3aed',
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

const FEATURES = [
  {
    icon: Lock,
    title: 'AES-256 Verschlüsselung',
    desc: 'Alle Dateien werden serverseitig mit AES-256 verschlüsselt gespeichert. Übertragung ausschließlich via TLS 1.3.',
  },
  {
    icon: Shield,
    title: 'DSGVO Art. 25 konform',
    desc: 'Privacy by Design: Keine IP-Adressen, kein Tracking, keine Weitergabe an Dritte. Server-Standort Frankfurt.',
  },
  {
    icon: Trash2,
    title: 'Automatische Löschung',
    desc: 'Dateien werden nach Ihrer konfigurierten Frist automatisch und unwiderruflich gelöscht.',
  },
  {
    icon: Bell,
    title: 'Sofort-Benachrichtigung',
    desc: 'Sie erhalten eine E-Mail, sobald ein Dokument hochgeladen wurde — mit Dateiname, Größe und Zeitstempel.',
  },
  {
    icon: Globe,
    title: 'Eigene Domain',
    desc: 'Nutzen Sie Ihre eigene Domain für das Upload-Portal. Professionell und vertrauenswürdig für Ihre Kunden.',
  },
  {
    icon: Upload,
    title: 'Kein Login für Kunden',
    desc: 'Ihre Kunden laden Dokumente hoch — ohne Registrierung, ohne App, einfach per Link.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Klaus Müller',
    role: 'Steuerberater, München',
    text: 'Endlich ein sicherer Weg, Belege von Mandanten zu empfangen. Kein E-Mail-Anhang mehr, keine unsicheren Clouddienste.',
    stars: 5,
  },
  {
    name: 'Anna Wagner',
    role: 'Rechtsanwältin, Hamburg',
    text: 'Die automatische Löschung und DSGVO-Konformität waren für uns entscheidend. Einfache Einrichtung, sofort einsatzbereit.',
    stars: 5,
  },
  {
    name: 'Thomas Hoffmann',
    role: 'Immobilienmakler, Berlin',
    text: 'Käufer und Verkäufer laden Unterlagen direkt hoch. Spart enorm Zeit und ist professioneller als WhatsApp.',
    stars: 5,
  },
];

const FAQS = [
  {
    q: 'Ist TresorLink wirklich DSGVO-konform?',
    a: 'Ja. Alle Daten werden ausschließlich auf Servern in Frankfurt, Deutschland (EU-Central-1) gespeichert. Wir erfassen keine personenbezogenen Daten der Uploader, keine IP-Adressen, kein Tracking. Die Übertragung erfolgt verschlüsselt via TLS 1.3, die Speicherung mit AES-256.',
  },
  {
    q: 'Brauchen meine Kunden ein Konto?',
    a: 'Nein. Ihre Kunden erhalten einfach Ihren persönlichen Upload-Link und können sofort Dokumente hochladen — ohne Registrierung, ohne App-Download.',
  },
  {
    q: 'Was passiert mit den Dateien nach dem Upload?',
    a: 'Sie werden in Ihrem sicheren Dashboard angezeigt. Nach der von Ihnen konfigurierten Frist (Standard: 14 Tage) werden sie automatisch und unwiderruflich gelöscht.',
  },
  {
    q: 'Was bedeutet "Eigene Domain" beim Kanzlei-Plan?',
    a: 'Ab dem Kanzlei-Plan können Sie eine eigene Upload-Domain einrichten, z.B. upload.ihre-kanzlei.de statt tresorlink.de/u/ihr-name. Das wirkt professioneller und stärkt das Vertrauen Ihrer Kunden.',
  },
  {
    q: 'Wie viele Nutzer kann ich beim Kanzlei-Plan hinzufügen?',
    a: 'Bis zu 5 Teammitglieder. Jedes Mitglied erhält seinen eigenen Upload-Link, z.B. /u/schmidt-lohnsteuer und /u/mueller-finanzen. Beim Premium-Plan sind unbegrenzt viele Nutzer möglich.',
  },
  {
    q: 'Wie funktioniert die Kündigung?',
    a: 'Jederzeit zum Monatsende kündbar. Keine Mindestlaufzeit, keine versteckten Kosten.',
  },
  {
    q: 'Gibt es einen kostenlosen Plan?',
    a: 'Nein. TresorLink ist ein professionelles Werkzeug für Berufsgeheimnisträger. Alle Pläne sind kostenpflichtig und starten ab 19 €/Monat.',
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingAnnual, setBillingAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppLogo size={36} />
            <span className="font-bold text-lg tracking-tight text-foreground">TresorLink</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funktionen</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preise</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-up-login-screen" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Anmelden
            </Link>
            <Link href="/sign-up-login-screen" className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all">
              Jetzt starten
            </Link>
          </div>
        </div>
      </nav>
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-primary/20">
            <Shield size={12} />
            DSGVO Art. 25 · AES-256 · TLS 1.3 · Server Frankfurt
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            Sichere Dokumente empfangen —<br />
            <span className="text-primary">ohne Kompromisse</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            TresorLink gibt Steuerberatern, Anwälten und Maklern ein DSGVO-konformes Upload-Portal.
            Kunden laden Dokumente sicher hoch — ohne Login, ohne App, einfach per Link.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up-login-screen" className="flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
              Jetzt starten
              <ArrowRight size={16} />
            </Link>
            <a href="#pricing" className="flex items-center gap-2 px-6 py-3.5 border border-border text-sm font-semibold text-foreground rounded-xl hover:bg-muted transition-all">
              Preise ansehen
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-5">
            Ab 19 €/Monat · Keine Mindestlaufzeit · Jederzeit kündbar
          </p>
        </div>
        <div className="relative max-w-3xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['DSGVO-konform', 'AES-256', 'TLS 1.3', 'Server Frankfurt']?.map((badge) => (
            <div key={badge} className="flex items-center justify-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
              <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
              <span className="text-xs font-semibold text-foreground">{badge}</span>
            </div>
          ))}
        </div>
      </section>
      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Alles, was Sie für sicheren Dokumentenempfang brauchen
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Entwickelt für Berufsgeheimnisträger — mit echten Sicherheitsstandards, nicht nur Versprechen.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES?.map((feature, i) => (
              <div key={feature?.title} className={`bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all ${i === 0 ? 'lg:col-span-2' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon size={18} className="text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{feature?.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature?.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* How it works */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">So einfach funktioniert es</h2>
            <p className="text-muted-foreground">In 3 Schritten zum sicheren Dokumentenempfang</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Users, title: 'Konto erstellen', desc: 'Registrieren Sie sich und wählen Sie Ihren Plan. Ihr persönliches Upload-Portal ist sofort einsatzbereit.' },
              { step: '02', icon: Globe, title: 'Link teilen', desc: 'Senden Sie Ihren Portal-Link per E-Mail oder binden Sie ihn auf Ihrer Website ein.' },
              { step: '03', icon: Bell, title: 'Dateien empfangen', desc: 'Ihre Kunden laden hoch — Sie erhalten sofort eine Benachrichtigung und sehen die Datei im Dashboard.' },
            ]?.map((item) => (
              <div key={item?.step} className="relative">
                <div className="text-5xl font-black text-primary/10 mb-4 leading-none">{item?.step}</div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <item.icon size={18} className="text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{item?.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item?.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Transparente Preise</h2>
            <p className="text-muted-foreground mb-6">Keine versteckten Kosten. Jederzeit kündbar. Kein kostenloser Plan.</p>
            {/* Billing toggle */}
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-xl p-1">
              <button
                onClick={() => setBillingAnnual(false)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${!billingAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Monatlich
              </button>
              <button
                onClick={() => setBillingAnnual(true)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${billingAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Jährlich
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${billingAnnual ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                  2 Monate gratis
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS?.map((plan) => {
              const price = billingAnnual ? plan?.yearlyPrice : plan?.monthlyPrice;
              const PlanIcon = plan?.icon;

              return (
                <div
                  key={plan?.id}
                  className={`relative bg-card rounded-2xl border flex flex-col ${
                    plan?.highlight
                      ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20'
                      : 'border-border'
                  }`}
                >
                  {plan?.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                        Beliebteste Wahl
                      </span>
                    </div>
                  )}
                  <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${plan?.color}1a` }}>
                        <PlanIcon size={14} style={{ color: plan?.color }} />
                      </div>
                      <h3 className="text-base font-bold text-foreground">{plan?.name}</h3>
                    </div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-black text-foreground">€{price}</span>
                      <span className="text-sm text-muted-foreground mb-1.5">/{billingAnnual ? 'Jahr' : 'Monat'}</span>
                    </div>
                    {billingAnnual && (
                      <p className="text-xs text-accent font-medium mb-1">
                        = €{Math.round(price / 12)}/Monat · 2 Monate gratis
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed">{plan?.description}</p>
                  </div>
                  <div className="p-6 flex-1">
                    <ul className="space-y-2.5">
                      {plan?.features?.map((feature) => (
                        <li key={feature?.text} className="flex items-start gap-2.5">
                          {feature?.included ? (
                            <Check size={14} className="text-primary flex-shrink-0 mt-0.5" />
                          ) : (
                            <X size={14} className="text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${feature?.included ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                            {feature?.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6 pt-0">
                    <Link
                      href={`/sign-up-login-screen?plan=${plan?.id}`}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                        plan?.highlight
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {plan?.cta}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Alle Preise zzgl. MwSt. · Jederzeit zum Monatsende kündbar · Keine Mindestlaufzeit
          </p>
        </div>
      </section>
      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Was unsere Nutzer sagen</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS?.map((t) => (
              <div key={t?.name} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-0.5 mb-4">
                  {Array.from({ length: t?.stars })?.map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-5">"{t?.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t?.name}</p>
                  <p className="text-xs text-muted-foreground">{t?.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Häufige Fragen</h2>
          </div>
          <div className="space-y-3">
            {FAQS?.map((faq, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-foreground pr-4">{faq?.q}</span>
                  <ChevronDown size={16} className={`text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq?.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-primary rounded-3xl p-10 sm:p-14 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white translate-x-16 -translate-y-16" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white -translate-x-12 translate-y-12" />
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Bereit für sicheren Dokumentenempfang?
              </h2>
              <p className="text-white/70 mb-8 text-base">
                Starten Sie jetzt — ab 19 €/Monat, keine Mindestlaufzeit.
              </p>
              <Link href="/sign-up-login-screen" className="inline-flex items-center gap-2 bg-white text-primary text-sm font-bold px-6 py-3.5 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all">
                Jetzt starten
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-border bg-card py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <AppLogo size={32} />
                <span className="font-bold text-base text-foreground">TresorLink</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                DSGVO-konformes Upload-Portal für Steuerberater, Anwälte und Makler.
                Server-Standort: Frankfurt, Deutschland.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div>
                <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Produkt</p>
                <ul className="space-y-2">
                  <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Funktionen</a></li>
                  <li><a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Preise</a></li>
                  <li><a href="#faq" className="text-xs text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Konto</p>
                <ul className="space-y-2">
                  <li><Link href="/sign-up-login-screen" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Anmelden</Link></li>
                  <li><Link href="/sign-up-login-screen" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Registrieren</Link></li>
                  <li><Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Rechtliches</p>
                <ul className="space-y-2">
                  <li><span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">Datenschutzerklärung</span></li>
                  <li><span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">Impressum</span></li>
                  <li><span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">AGB</span></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© 2026 TresorLink GmbH · Alle Rechte vorbehalten</p>
            <div className="flex items-center gap-3">
              {['DSGVO', 'AES-256', 'TLS 1.3']?.map((b) => (
                <span key={b} className="text-xs font-medium text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
