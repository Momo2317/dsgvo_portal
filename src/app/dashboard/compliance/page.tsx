'use client';

import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { DashboardPage, PageHeader } from '@/components/dashboard/DashboardPage';
import { Shield, CheckCircle2, AlertCircle, FileText, Lock, Server, Clock, Globe } from 'lucide-react';

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  status: 'compliant' | 'info';
  icon: React.ReactNode;
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    id: 'c1',
    title: 'Datenverschlüsselung (Art. 32 DSGVO)',
    description: 'Alle Dateien werden verschlüsselt übertragen (TLS 1.3) und verschlüsselt gespeichert (AES-256). Supabase Storage gewährleistet Encryption at Rest.',
    status: 'compliant',
    icon: <Lock size={16} />,
  },
  {
    id: 'c2',
    title: 'Datensparsamkeit (Art. 5 DSGVO)',
    description: 'Es werden ausschließlich Datei-Metadaten (Name, Größe, Typ) gespeichert. Keine IP-Adressen, keine Standortdaten, keine Tracking-Cookies.',
    status: 'compliant',
    icon: <Shield size={16} />,
  },
  {
    id: 'c3',
    title: 'Automatische Löschung (Art. 17 DSGVO)',
    description: 'Dateien werden nach dem konfigurierten Zeitraum (Standard: 14 Tage) automatisch und unwiderruflich gelöscht. Recht auf Vergessenwerden ist implementiert.',
    status: 'compliant',
    icon: <Clock size={16} />,
  },
  {
    id: 'c4',
    title: 'Kein Kunden-Login erforderlich',
    description: 'Kunden können Dateien hochladen ohne ein Konto zu erstellen. Keine personenbezogenen Daten der Kunden werden dauerhaft gespeichert.',
    status: 'compliant',
    icon: <Globe size={16} />,
  },
  {
    id: 'c5',
    title: 'EU-Datenspeicherung (Art. 44 DSGVO)',
    description: 'Alle Daten werden ausschließlich in EU-Rechenzentren (Frankfurt, eu-central-1) gespeichert. Kein Datentransfer in Drittländer.',
    status: 'compliant',
    icon: <Server size={16} />,
  },
  {
    id: 'c6',
    title: 'Zugriffskontrolle (Art. 32 DSGVO)',
    description: 'Row-Level Security (RLS) stellt sicher, dass jeder Nutzer ausschließlich auf seine eigenen Daten zugreifen kann. Keine Cross-Tenant-Datenlecks möglich.',
    status: 'compliant',
    icon: <FileText size={16} />,
  },
];

const LEGAL_NOTES = [
  {
    id: 'l1',
    title: 'Auftragsverarbeitungsvertrag (AVV)',
    body: 'Für den produktiven Einsatz ist ein AVV mit Supabase Inc. erforderlich. Supabase bietet einen standardisierten DPA (Data Processing Agreement) an, der unter supabase.com/legal/dpa heruntergeladen werden kann.',
  },
  {
    id: 'l2',
    title: 'Datenschutzerklärung',
    body: 'Ihre Mandanten müssen über die Datenverarbeitung informiert werden. Fügen Sie einen Link zu Ihrer Datenschutzerklärung auf der Upload-Seite hinzu. TresorLink speichert keine personenbezogenen Daten der Mandanten.',
  },
  {
    id: 'l3',
    title: 'Technische und organisatorische Maßnahmen (TOMs)',
    body: 'Dokumentieren Sie die TOMs gemäß Art. 32 DSGVO. TresorLink implementiert: Verschlüsselung, Zugriffskontrolle, automatische Löschung, Protokollierung und Datensparsamkeit.',
  },
];

export default function CompliancePage() {
  return (
    <DashboardLayout>
      <DashboardPage width="narrow">
        <PageHeader
          icon={<Shield size={20} />}
          title="DSGVO & Compliance"
          description="Datenschutz-Konformitätsstatus Ihres Portals"
          iconClassName="bg-accent/10 text-accent"
        />

          <div className="ui-alert bg-accent/10 border-accent/30">
            <CheckCircle2 size={20} className="text-accent flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Alle Kernfunktionen DSGVO-konform</p>
              <p className="text-xs text-muted-foreground mt-0.5">TresorLink ist für den Einsatz in Deutschland und der EU konzipiert</p>
            </div>
          </div>

          {/* Compliance checklist */}
          <div className="ui-card-divided">
            {COMPLIANCE_ITEMS.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent mt-0.5">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <span className="flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={10} />
                      Konform
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Legal notes */}
          <h2 className="ui-section-title mb-4">
            <AlertCircle size={14} className="text-warning" />
            Rechtliche Hinweise
          </h2>
          <div className="space-y-4">
            {LEGAL_NOTES.map((note) => (
              <div key={note.id} className="ui-card-padded">
                <p className="text-sm font-semibold text-foreground mb-1">{note.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{note.body}</p>
              </div>
            ))}
          </div>
      </DashboardPage>
    </DashboardLayout>
  );
}
