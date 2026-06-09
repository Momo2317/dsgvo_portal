'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import DashboardLayout from '../components/DashboardLayout';
import { DashboardPage, PageHeader } from '@/components/dashboard/DashboardPage';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { workspaceService } from '@/lib/services/portalService';
import { subscriptionService } from '@/lib/services/subscriptionService';
import type { PlanLimits, PlanType } from '@/lib/planLimits';
import {
  Link2,
  Loader2,
  Plus,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';

export default function PortalsPage() {
  const { workspaces, setActiveWorkspace, refreshWorkspaces } = useWorkspace();
  const [plan, setPlan] = useState<PlanType>('starter');
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  useEffect(() => {
    const load = async () => {
      try {
        const [currentPlan, planLimits] = await Promise.all([
          subscriptionService.getCurrentPlan(),
          subscriptionService.getPlanLimits(),
        ]);
        setPlan(currentPlan);
        setLimits(planLimits);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxPortals = limits?.maxPortals ?? 1;
  const atLimit = maxPortals >= 0 && workspaces.length >= maxPortals;
  const canCreate = maxPortals < 0 || !atLimit;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setCreating(true);
      const created = await workspaceService.createWorkspace(newName.trim());
      await refreshWorkspaces();
      setActiveWorkspace(created);
      setNewName('');
      toast.success('Upload-Portal erstellt');
    } catch (err: any) {
      toast.error(err?.message || 'Portal konnte nicht erstellt werden');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Dieses Portal und alle zugehörigen Dateien wirklich löschen?')) return;
    try {
      await workspaceService.deleteWorkspace(id);
      await refreshWorkspaces();
      toast.success('Portal gelöscht');
    } catch (err: any) {
      toast.error(err?.message || 'Löschen fehlgeschlagen');
    }
  };

  const handleCopy = (slug: string, id: string) => {
    const url = `${siteUrl}/u/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <DashboardLayout>
      <DashboardPage>
        <PageHeader
          icon={<Link2 size={20} />}
          title="Upload-Portale"
          description={
            maxPortals < 0
              ? 'Unbegrenzte Upload-Links'
              : `${workspaces.length} / ${maxPortals} Portale genutzt`
          }
          action={
            plan === 'starter' ? (
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Auf Kanzlei upgraden
                <ArrowUpRight size={14} />
              </Link>
            ) : undefined
          }
        />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              {canCreate ? (
                <form
                  onSubmit={handleCreate}
                  className="ui-card-padded flex flex-col sm:flex-row gap-4"
                >
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name des Portals (z. B. Mandant Müller)"
                    className="ui-input flex-1"
                    maxLength={80}
                  />
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="ui-btn-primary"
                  >
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Neues Portal
                  </button>
                </form>
              ) : (
                <div className="ui-alert bg-warning/10 border-warning/30 text-sm text-foreground">
                  Sie haben das Limit von {maxPortals} Portalen erreicht.{' '}
                  <Link href="/dashboard/billing" className="text-primary font-semibold hover:underline">
                    Plan upgraden
                  </Link>
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-4">
                Jedes Portal hat einen eigenen Upload-Link. Welches Portal im Dashboard angezeigt wird,
                wählen Sie oben in der Leiste (bei mehreren Portalen).
              </p>

              <div className="space-y-4">
                {workspaces.map((ws) => {
                  const portalUrl = `${siteUrl}/u/${ws.slug}`;
                  return (
                    <div
                      key={ws.id}
                      className="ui-card-padded flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate mb-1">
                          {ws.name || ws.slug}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground truncate">{portalUrl}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleCopy(ws.slug, ws.id)}
                          className="ui-btn-sm border border-border hover:bg-muted"
                        >
                          {copiedId === ws.id ? <Check size={13} /> : <Copy size={13} />}
                          Kopieren
                        </button>
                        <a
                          href={`/u/${ws.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ui-btn-sm bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <ExternalLink size={13} />
                          Öffnen
                        </a>
                        {workspaces.length > 1 && (
                          <button
                            onClick={() => handleDelete(ws.id)}
                            className="ui-btn-sm text-danger border border-danger/30 hover:bg-danger/10"
                          >
                            <Trash2 size={13} />
                            Löschen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
      </DashboardPage>
    </DashboardLayout>
  );
}
