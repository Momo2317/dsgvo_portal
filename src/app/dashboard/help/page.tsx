'use client';

import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { HelpCircle, ChevronDown, ChevronUp, ExternalLink, Mail, MessageCircle, BookOpen } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQ[] = [
  {
    id: 'f1',
    question: 'Wie teile ich mein Upload-Portal mit Mandanten?',
    answer: 'Kopieren Sie Ihre persönliche Upload-URL aus dem Dashboard (oben in der Navigationsleiste). Senden Sie diese URL per E-Mail an Ihre Mandanten. Sie können Dateien hochladen, ohne ein Konto zu erstellen.',
  },
  {
    id: 'f2',
    question: 'Welche Dateiformate werden unterstützt?',
    answer: 'TresorLink unterstützt PDF, JPEG, PNG und DOCX-Dateien. Die maximale Dateigröße beträgt 50 MB pro Datei. Mehrere Dateien können gleichzeitig hochgeladen werden.',
  },
  {
    id: 'f3',
    question: 'Wie lange werden Dateien gespeichert?',
    answer: 'Standardmäßig werden Dateien nach 14 Tagen automatisch gelöscht. Sie können diesen Zeitraum in den Einstellungen auf 7, 14, 30, 60 oder 90 Tage anpassen. Dies entspricht dem DSGVO-Grundsatz der Datensparsamkeit.',
  },
  {
    id: 'f4',
    question: 'Können Mandanten sehen, welche Dateien sie hochgeladen haben?',
    answer: 'Nein. Das Upload-Portal ist bewusst einfach gehalten. Mandanten sehen nur die Upload-Oberfläche und erhalten eine Bestätigung nach erfolgreichem Upload. Sie haben keinen Zugriff auf eine Dateiliste.',
  },
  {
    id: 'f5',
    question: 'Wie lade ich Dateien herunter?',
    answer: 'Gehen Sie zu "Dateien" in der Seitenleiste. Klicken Sie auf den Download-Button neben der gewünschten Datei. Die Datei wird als signierter, temporärer Link (5 Minuten gültig) heruntergeladen.',
  },
  {
    id: 'f6',
    question: 'Ist TresorLink DSGVO-konform?',
    answer: 'Ja. TresorLink wurde speziell für den deutschen Markt entwickelt. Alle Daten werden in EU-Rechenzentren (Frankfurt) gespeichert, es werden keine Mandanten-IP-Adressen gespeichert, und Dateien werden automatisch gelöscht. Für den produktiven Einsatz empfehlen wir den Abschluss eines AVV mit Supabase.',
  },
  {
    id: 'f7',
    question: 'Wie passe ich das Branding meines Portals an?',
    answer: 'Klicken Sie im Dashboard auf "Portal-Einstellungen". Dort können Sie Ihr Firmenlogo hochladen, den Portal-Titel und Begrüßungstext anpassen sowie die Akzentfarbe ändern. Alle Änderungen sind sofort für Ihre Mandanten sichtbar.',
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hilfe & Support</h1>
              <p className="text-sm text-muted-foreground">Häufige Fragen und Kontaktmöglichkeiten</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[
              { icon: <BookOpen size={16} />, label: 'Dokumentation', sub: 'Vollständige Anleitung', href: '#' },
              { icon: <Mail size={16} />, label: 'E-Mail Support', sub: 'support@tresorlink.de', href: 'mailto:support@tresorlink.de' },
              { icon: <MessageCircle size={16} />, label: 'Live-Chat', sub: 'Mo–Fr 9–17 Uhr', href: '#' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-muted transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                </div>
                <ExternalLink size={12} className="text-muted-foreground ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>

          {/* FAQ */}
          <h2 className="text-sm font-bold text-foreground mb-3">Häufig gestellte Fragen</h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {FAQS.map((faq) => (
              <div key={faq.id}>
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground pr-4">{faq.question}</span>
                  {openFaq === faq.id ? (
                    <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {openFaq === faq.id && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
