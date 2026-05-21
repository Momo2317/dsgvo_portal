'use client';

import React, { useState, useEffect } from 'react';
import KPICards from './KPICards';
import FileTable from './FileTable';
import StorageChart from './StorageChart';
import BrandingPanel from './BrandingPanel';
import { Settings2, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { workspaceService, brandingService, fileService } from '@/lib/services/portalService';
import { profileService } from '@/lib/services/portalService';
import type { Workspace, BrandingSettings, UploadedFile, UserProfile } from '@/lib/services/portalService';

export interface DashboardData {
  workspace: Workspace | null;
  branding: BrandingSettings | null;
  files: UploadedFile[];
  profile: UserProfile | null;
}

export default function DashboardContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<DashboardData>({
    workspace: null,
    branding: null,
    files: [],
    profile: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [profile, workspace] = await Promise.all([
        profileService.getProfile(),
        workspaceService.getMyWorkspace(),
      ]);

      if (!workspace) {
        setData({ workspace: null, branding: null, files: [], profile });
        return;
      }

      const [branding, files] = await Promise.all([
        brandingService.getBranding(workspace.id),
        fileService.getFiles(workspace.id),
      ]);

      setData({ workspace, branding, files, profile });
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyLink = () => {
    if (!data.workspace) return;
    const customDomain = data.branding?.customDomain;
    const url = customDomain
      ? `https://${customDomain}`
      : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/u/${data.workspace.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displayName = data.profile?.fullName?.split(' ')[0] || data.profile?.email?.split('@')[0] || 'Nutzer';
  const customDomain = data.branding?.customDomain;
  const portalUrl = data.workspace
    ? customDomain
      ? `https://${customDomain}`
      : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/u/${data.workspace.slug}`
    : '';

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Dashboard wird geladen...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-danger mb-3">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
          >
            Erneut versuchen
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 xl:px-8 2xl:px-10 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Willkommen zurück, {displayName}.
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted hover:text-foreground active:scale-[0.97] transition-all"
          >
            <Settings2 size={16} />
            <span className="hidden sm:inline">Portal-Einstellungen</span>
          </button>
        </div>

        {/* Portal Link Banner */}
        {data.workspace && (
          <div className="mb-6 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary mb-0.5">Ihr Upload-Portal</p>
              <p className="text-sm font-mono text-foreground truncate">{portalUrl}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-background hover:bg-muted transition-all text-foreground"
              >
                {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
                {copied ? 'Kopiert!' : 'Kopieren'}
              </button>
              <a
                href={customDomain ? `https://${customDomain}` : `/u/${data.workspace.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
              >
                <ExternalLink size={13} />
                Portal öffnen
              </a>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <KPICards files={data.files} />

        {/* Main content grid */}
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
          {/* File table — takes 3/4 width */}
          <div className="xl:col-span-3 2xl:col-span-3">
            <FileTable
              files={data.files}
              onFilesChange={(updatedFiles) =>
                setData((prev) => ({ ...prev, files: updatedFiles }))
              }
            />
          </div>

          {/* Storage chart — takes 1/4 width */}
          <div className="xl:col-span-1 2xl:col-span-1">
            <StorageChart files={data.files} />
          </div>
        </div>
      </div>

      {/* Branding settings panel */}
      {settingsOpen && data.workspace && (
        <BrandingPanel
          workspace={data.workspace}
          branding={data.branding}
          onClose={() => setSettingsOpen(false)}
          onSaved={(updatedBranding, updatedWorkspace) => {
            setData((prev) => ({
              ...prev,
              branding: updatedBranding,
              workspace: updatedWorkspace || prev.workspace,
            }));
          }}
        />
      )}
    </main>
  );
}