'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import DashboardLayout from '../components/DashboardLayout';
import { DashboardPage, PageHeader } from '@/components/dashboard/DashboardPage';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { teamService, profileService } from '@/lib/services/portalService';
import type { TeamMember } from '@/lib/services/portalService';
import { subscriptionService } from '@/lib/services/subscriptionService';
import type { PlanLimits, PlanType } from '@/lib/planLimits';
import {
  Users,
  Loader2,
  UserPlus,
  Trash2,
  Crown,
  ArrowUpRight,
  Mail,
} from 'lucide-react';

export default function TeamPage() {
  const { workspaces } = useWorkspace();
  const [plan, setPlan] = useState<PlanType>('starter');
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [currentPlan, planLimits, team, profile] = await Promise.all([
        subscriptionService.getCurrentPlan(),
        subscriptionService.getPlanLimits(),
        teamService.getTeamMembers(),
        profileService.getProfile(),
      ]);
      setPlan(currentPlan);
      setLimits(planLimits);
      setMembers(team);
      setOwnerEmail(profile?.email || '');
    } catch (err: any) {
      toast.error(err?.message || 'Team konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const maxUsers = limits?.maxUsers ?? 1;
  const currentCount = 1 + members.length;
  const atLimit = maxUsers >= 0 && currentCount >= maxUsers;
  const teamEnabled = maxUsers < 0 || maxUsers > 1;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setInviting(true);
      await teamService.inviteMember(email.trim(), workspaceId || null);
      setEmail('');
      setWorkspaceId('');
      await load();
      toast.success('Einladung per E-Mail gesendet');
    } catch (err: any) {
      toast.error(err?.message || 'Einladung fehlgeschlagen');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Teammitglied wirklich entfernen?')) return;
    try {
      await teamService.removeMember(id);
      await load();
      toast.success('Teammitglied entfernt');
    } catch (err: any) {
      toast.error(err?.message || 'Entfernen fehlgeschlagen');
    }
  };

  const workspaceLabel = (id: string | null) => {
    if (!id) return '—';
    const ws = workspaces.find((w) => w.id === id);
    return ws?.name || ws?.slug || 'Portal';
  };

  return (
    <DashboardLayout>
      <DashboardPage>
        <PageHeader
          icon={<Users size={20} />}
          title="Team"
          description={
            maxUsers < 0
              ? 'Unbegrenzte Teammitglieder'
              : `${currentCount} / ${maxUsers} Benutzer`
          }
          action={
            !teamEnabled ? (
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Kanzlei-Plan für Team freischalten
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
              {!teamEnabled && (
                <div className="ui-alert bg-muted border-border text-sm text-muted-foreground">
                  Im Starter-Plan ist nur ein Benutzer (Sie) enthalten. Mit dem{' '}
                  <strong className="text-foreground">Kanzlei-Plan</strong> können Sie bis zu 5
                  Teammitglieder einladen — jeweils mit eigenem Upload-Link.
                </div>
              )}

              {teamEnabled && !atLimit && (
                <form
                  onSubmit={handleInvite}
                  className="ui-card-padded space-y-4"
                >
                  <p className="text-sm font-medium text-foreground">Teammitglied einladen</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-Mail-Adresse"
                      className="ui-input flex-1"
                      required
                    />
                    <select
                      value={workspaceId}
                      onChange={(e) => setWorkspaceId(e.target.value)}
                      className="ui-input sm:max-w-xs"
                    >
                      <option value="">Portal zuweisen (optional)</option>
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name || ws.slug}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="ui-btn-primary"
                    >
                      {inviting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <UserPlus size={16} />
                      )}
                      Einladen
                    </button>
                  </div>
                </form>
              )}

              {teamEnabled && atLimit && (
                <div className="ui-alert bg-warning/10 border-warning/30 text-sm">
                  Benutzerlimit erreicht ({maxUsers}).{' '}
                  <Link href="/dashboard/billing" className="text-primary font-semibold hover:underline">
                    Plan upgraden
                  </Link>
                </div>
              )}

              <div className="ui-card-divided">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mitglieder
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  <li className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Crown size={16} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {ownerEmail || 'Kontoinhaber'}
                        </p>
                        <p className="text-xs text-muted-foreground">Inhaber · Administrator</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                      Aktiv
                    </span>
                  </li>
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Mail size={16} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {m.memberEmail}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.status === 'pending' ? 'Einladung ausstehend' : 'Aktiv'}
                            {m.workspaceId ? ` · ${workspaceLabel(m.workspaceId)}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="p-2 text-muted-foreground hover:text-danger rounded-lg hover:bg-danger/10"
                        title="Entfernen"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                  {members.length === 0 && teamEnabled && (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Noch keine eingeladenen Teammitglieder.
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
      </DashboardPage>
    </DashboardLayout>
  );
}
