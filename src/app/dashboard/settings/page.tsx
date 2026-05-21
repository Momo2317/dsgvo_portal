'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Settings, User, Building2, Mail, Save, Loader2, CheckCircle2, Key, ExternalLink, Copy } from 'lucide-react';
import { workspaceService, profileService, brandingService } from '@/lib/services/portalService';
import type { Workspace, UserProfile, BrandingSettings } from '@/lib/services/portalService';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [autoDeleteDays, setAutoDeleteDays] = useState('14');

  useEffect(() => {
    const load = async () => {
      try {
        const [p, ws] = await Promise.all([
          profileService.getProfile(),
          workspaceService.getMyWorkspace(),
        ]);
        setProfile(p);
        setWorkspace(ws);
        setFullName(p?.fullName || '');
        setCompany(p?.company || '');
        if (ws) {
          const br = await brandingService.getBranding(ws.id);
          setBranding(br);
          setNotifyEmail(br?.notifyEmail || p?.email || '');
          setAutoDeleteDays(String(br?.autoDeleteDays || 14));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ full_name: fullName, company })
          .eq('id', user.id);
      }
      await brandingService.updateBranding(workspace.id, {
        notifyEmail: notifyEmail || null,
        autoDeleteDays: Number(autoDeleteDays),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const portalUrl = workspace
    ? `${process.env.NEXT_PUBLIC_SITE_URL || ''}/u/${workspace.slug}`
    : '';

  const handleCopy = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
              <p className="text-sm text-muted-foreground">Konto- und Portal-Konfiguration</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <User size={16} className="text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Profil</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Vollständiger Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      <Building2 size={12} className="inline mr-1" />
                      Unternehmen / Kanzlei
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="Mustermann & Partner GmbH"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      <Mail size={12} className="inline mr-1" />
                      E-Mail-Adresse
                    </label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">E-Mail kann nicht geändert werden</p>
                  </div>
                </div>
              </div>

              {/* Portal settings */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Key size={16} className="text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Portal-Konfiguration</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Ihre Upload-URL</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2.5 text-xs font-mono border border-border rounded-lg bg-muted text-muted-foreground truncate">
                        {portalUrl || 'Wird geladen...'}
                      </div>
                      <button
                        onClick={handleCopy}
                        className="p-2.5 border border-border rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                        title="URL kopieren"
                      >
                        {copied ? <CheckCircle2 size={15} className="text-accent" /> : <Copy size={15} />}
                      </button>
                      {workspace && (
                        <a
                          href={`/u/${workspace.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 border border-border rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-primary"
                          title="Portal öffnen"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      <Mail size={12} className="inline mr-1" />
                      Benachrichtigungs-E-Mail
                    </label>
                    <input
                      type="email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="benachrichtigungen@kanzlei.de"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Wird bei neuen Uploads benachrichtigt</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Automatische Löschung nach (Tage)</label>
                    <select
                      value={autoDeleteDays}
                      onChange={(e) => setAutoDeleteDays(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      <option value="7">7 Tage</option>
                      <option value="14">14 Tage (empfohlen)</option>
                      <option value="30">30 Tage</option>
                      <option value="60">60 Tage</option>
                      <option value="90">90 Tage</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">DSGVO-konform: Dateien werden automatisch gelöscht</p>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : saved ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Wird gespeichert...' : saved ? 'Gespeichert!' : 'Einstellungen speichern'}
              </button>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
