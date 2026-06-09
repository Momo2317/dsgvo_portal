'use client';

import React from 'react';
import {
  Files,
  AlertTriangle,
  HardDrive,
  Wifi,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import type { UploadedFile } from '@/lib/services/portalService';

interface KPICardsProps {
  files: UploadedFile[];
  storageLimitGb?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function KPICards({ files, storageLimitGb = 10 }: KPICardsProps) {
  const totalFiles = files?.length || 0;
  const newFiles = files?.filter((f) => f?.status === 'new').length || 0;

  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const expiringFiles = files?.filter((f) => {
    if (!f?.expiresAt) return false;
    const expiresMs = new Date(f.expiresAt).getTime();
    return expiresMs - now <= threeDaysMs && expiresMs > now;
  }).length || 0;

  const totalBytes = files?.reduce((sum, f) => sum + (f?.fileSize || 0), 0) || 0;
  const totalStorage = formatBytes(totalBytes);

  const lastUpload = files?.length
    ? (() => {
        const sorted = [...files].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const diff = now - new Date(sorted[0].createdAt).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
        if (hours > 0) return `vor ${hours}h`;
        return 'gerade eben';
      })()
    : 'Noch kein Upload';

  const KPI_DATA = [
    {
      id: 'kpi-files-received',
      label: 'Dateien empfangen',
      value: String(totalFiles),
      sub: `${newFiles} neu`,
      icon: Files,
      trend: 'up',
      cardClass: 'kpi-card-primary',
      iconClass: 'text-primary bg-primary/10',
    },
    {
      id: 'kpi-expiring',
      label: 'Läuft bald ab',
      value: String(expiringFiles),
      sub: 'Innerhalb von 3 Tagen',
      icon: AlertTriangle,
      trend: 'warn',
      cardClass: 'kpi-card-warning',
      iconClass: 'text-warning bg-warning/10',
    },
    {
      id: 'kpi-storage',
      label: 'Speicher genutzt',
      value: totalStorage,
      sub: `${totalFiles} Datei${totalFiles !== 1 ? 'en' : ''} · Limit ${storageLimitGb} GB`,
      icon: HardDrive,
      trend: 'neutral',
      cardClass: 'kpi-card-neutral',
      iconClass: 'text-muted-foreground bg-muted',
    },
    {
      id: 'kpi-portal',
      label: 'Portal-Status',
      value: 'Aktiv',
      sub: `Letzter Upload: ${lastUpload}`,
      icon: Wifi,
      trend: 'up',
      cardClass: 'kpi-card-success',
      iconClass: 'text-accent bg-accent/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {KPI_DATA?.map((kpi) => (
        <div
          key={kpi?.id}
          className={`rounded-xl border p-5 shadow-card ${kpi?.cardClass}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi?.iconClass}`}
            >
              <kpi.icon size={18} />
            </div>
            {kpi?.trend === 'up' && (
              <TrendingUp size={14} className="text-accent mt-1" />
            )}
            {kpi?.trend === 'warn' && (
              <Clock size={14} className="text-warning mt-1" />
            )}
            {kpi?.trend === 'down' && (
              <TrendingDown size={14} className="text-danger mt-1" />
            )}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {kpi?.label}
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {kpi?.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{kpi?.sub}</p>
        </div>
      ))}
    </div>
  );
}