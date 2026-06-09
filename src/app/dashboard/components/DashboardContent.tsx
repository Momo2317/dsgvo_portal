'use client';

import React, { useState, useEffect } from 'react';
import KPICards from './KPICards';
import FileTable from './FileTable';
import StorageChart from './StorageChart';
import BrandingPanel from './BrandingPanel';
import PlanUsageBanner from './PlanUsageBanner';
import { Settings2, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { brandingService, fileService } from '@/lib/services/portalService';
import { profileService } from '@/lib/services/portalService';
import type { BrandingSettings, UploadedFile, UserProfile } from '@/lib/services/portalService';
import { subscriptionService } from '@/lib/services/subscriptionService';
import type { PlanType, PlanLimits } from '@/lib/planLimits';
import { useAccount } from '@/contexts/AccountContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { PortalLimitsResponse } from '@/app/api/portal-limits/route';
import { DashboardPage } from '@/components/dashboard/DashboardPage';

export interface DashboardData {
  branding: BrandingSettings | null;
  files: UploadedFile[];
  profile: UserProfile | null;
}

export default function DashboardContent() {
  const { teamMembership } = useAccount();
  const { activeWorkspace, loading: wsLoading } = useWorkspace();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<DashboardData>({
    branding: null,
    files: [],
    profile: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanType>('starter');
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [usage, setUsage] = useState<Pick<
    PortalLimitsResponse,
    'storageUsedBytes' | 'portalCount' | 'teamMemberCount'
  >>({ storageUsedBytes: 0, portalCount: 1, teamMemberCount: 1 });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [profile, limits, currentPlan] = await Promise.all([
        profileService.getProfile(),
        subscriptionService.getPlanLimits(),
        subscriptionService.getCurrentPlan(),
      ]);
      setPlanLimits(limits);
      setPlan(currentPlan);

      if (!activeWorkspace) {
        setData({ branding: null, files: [], profile });
        return;
      }

      const [branding, files, limitsRes] = await Promise.all([
        brandingService.getBranding(activeWorkspace.id),
        fileService.getFiles(activeWorkspace.id),
        fetch(`/api/portal-limits?workspaceId=${activeWorkspace.id}`),
      ]);

      if (limitsRes.ok) {
        const portalLimits = (await limitsRes.json()) as PortalLimitsResponse;
        setUsage({
          storageUsedBytes: portalLimits.storageUsedBytes,
          portalCount: portalLimits.portalCount,
          teamMemberCount: portalLimits.teamMemberCount,
        });
      }

      setData({ branding: branding, files, profile });
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wsLoading) loadData();
  }, [activeWorkspace?.id, wsLoading]);

  const canUseCustomDomain = planLimits?.customDomain ?? false;
  const effectiveCustomDomain =
    canUseCustomDomain && data.branding?.customDomain ? data.branding.customDomain : null;

  const handleCopyLink = () => {
    if (!activeWorkspace) return;
    const url = effectiveCustomDomain
      ? `https://${effectiveCustomDomain}`
      : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/u/${activeWorkspace.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displayName =
    data.profile?.fullName?.trim() ||
    data.profile?.company?.trim() ||
    data.profile?.email?.split('@')[0] ||
    'Nutzer';
  const portalUrl = activeWorkspace
    ? effectiveCustomDomain
      ? `https://${effectiveCustomDomain}`
      : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/u/${activeWorkspace.slug}`
    : '';

  if (loading || wsLoading) {
    return (
      <main className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Dashboard wird geladen...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-sm text-danger mb-3">{error}</p>
          <button
            onClick={loadData}
            className="ui-btn-primary"
          >
            Erneut versuchen
          </button>
        </div>
      </main>
    );
  }

  return (
    <DashboardPage>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Willkommen zurück, {displayName}.
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="ui-btn-secondary text-muted-foreground hover:text-foreground"
          >
            <Settings2 size={16} />
            <span className="hidden sm:inline">Portal-Einstellungen</span>
          </button>
        </div>

        {planLimits && (
          <PlanUsageBanner
            plan={plan}
            limits={planLimits}
            storageUsedBytes={usage.storageUsedBytes}
            portalCount={usage.portalCount}
            teamMemberCount={usage.teamMemberCount}
            teamOwnerName={teamMembership?.ownerCompany || teamMembership?.ownerName || null}
          />
        )}

        {/* Portal Link Banner */}
        {activeWorkspace && (
          <div className="ui-alert bg-primary/5 border-primary/20 flex-col sm:flex-row sm:items-center">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary mb-0.5">Ihr Upload-Portal</p>
              <p className="text-sm font-mono text-foreground truncate">{portalUrl}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleCopyLink}
                className="ui-btn-sm border border-border bg-background hover:bg-muted text-foreground"
              >
                {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
                {copied ? 'Kopiert!' : 'Kopieren'}
              </button>
              <a
                href={effectiveCustomDomain ? `https://${effectiveCustomDomain}` : `/u/${activeWorkspace.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ui-btn-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink size={13} />
                Portal öffnen
              </a>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <KPICards files={data.files} storageLimitGb={planLimits?.storageGb} />

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
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
            <StorageChart files={data.files} storageLimitGb={planLimits?.storageGb} />
          </div>
        </div>
      {/* Branding settings panel */}
      {settingsOpen && activeWorkspace && (
        <BrandingPanel
          workspace={activeWorkspace}
          branding={data.branding}
          planLimits={planLimits}
          onClose={() => setSettingsOpen(false)}
          onSaved={(updatedBranding) => {
            setData((prev) => ({
              ...prev,
              branding: updatedBranding,
            }));
          }}
        />
      )}
    </DashboardPage>
  );
}