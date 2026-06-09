'use client';

import React from 'react';
import Link from 'next/link';
import { Zap, Users, HardDrive, FileUp, Globe, ArrowUpRight } from 'lucide-react';
import type { PlanLimits, PlanType } from '@/lib/planLimits';
import { PLAN_LABELS } from '@/lib/planLimits';

interface PlanUsageBannerProps {
  plan: PlanType;
  limits: PlanLimits;
  storageUsedBytes: number;
  portalCount?: number;
  teamMemberCount?: number;
  teamOwnerName?: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function PlanUsageBanner({
  plan,
  limits,
  storageUsedBytes,
  portalCount = 1,
  teamMemberCount = 1,
  teamOwnerName = null,
}: PlanUsageBannerProps) {
  const storagePct = Math.min(
    100,
    Math.round((storageUsedBytes / (limits.storageGb * 1024 * 1024 * 1024)) * 100)
  );

  const items = [
    {
      icon: Users,
      label: 'Benutzer',
      value:
        limits.maxUsers < 0
          ? `${teamMemberCount} · Unbegrenzt`
          : `${teamMemberCount} / ${limits.maxUsers}`,
    },
    {
      icon: Zap,
      label: 'Upload-Links',
      value:
        limits.maxPortals < 0
          ? `${portalCount} · Unbegrenzt`
          : `${portalCount} / ${limits.maxPortals}`,
    },
    {
      icon: HardDrive,
      label: 'Speicher',
      value: `${formatBytes(storageUsedBytes)} / ${limits.storageGb} GB`,
    },
    {
      icon: FileUp,
      label: 'Max. Dateigröße',
      value: limits.maxFileSizeMb < 0 ? 'Unbegrenzt' : `${limits.maxFileSizeMb} MB`,
    },
    {
      icon: Globe,
      label: 'Eigene Domain',
      value: limits.customDomain ? 'Verfügbar' : 'Nicht enthalten',
    },
  ];

  return (
    <div className="ui-card-padded">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            {teamOwnerName
              ? `Team-Plan: ${PLAN_LABELS[plan]}`
              : `Ihr Plan: ${PLAN_LABELS[plan]}`}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {teamOwnerName
              ? `Teammitglied bei ${teamOwnerName} · gemeinsame Limits des Kontoinhabers`
              : plan === 'starter'
                ? 'Einzelnutzer · 1 Portal · 10 GB · max. 20 MB pro Datei'
                : plan === 'kanzlei'
                  ? 'Bis zu 5 Teammitglieder · 5 Upload-Links · 50 GB gesamt · max. 100 MB pro Datei'
                  : 'Plan-Limits und aktuelle Nutzung'}
          </p>
        </div>
        {!teamOwnerName && plan !== 'premium' && (
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            {plan === 'kanzlei' ? 'Auf Premium upgraden' : 'Plan upgraden'}
            <ArrowUpRight size={14} />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div key={item.label} className="bg-muted/50 rounded-lg px-4 py-3 border border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <item.icon size={12} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{item.label}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Speichernutzung</span>
          <span>{storagePct}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              storagePct >= 90 ? 'bg-danger' : storagePct >= 70 ? 'bg-warning' : 'bg-primary'
            }`}
            style={{ width: `${storagePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
