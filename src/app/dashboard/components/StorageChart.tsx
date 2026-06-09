'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { HardDrive, TrendingUp } from 'lucide-react';
import type { UploadedFile } from '@/lib/services/portalService';

const StorageChartInner = dynamic(() => import('./StorageChartInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48">
      <div className="w-32 h-32 rounded-full border-8 border-muted animate-pulse" />
    </div>
  ),
});

interface StorageChartProps {
  files: UploadedFile[];
  storageLimitGb?: number;
}

function formatMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(0)} MB`;
}

export default function StorageChart({ files, storageLimitGb = 10 }: StorageChartProps) {
  const limitBytes = storageLimitGb * 1024 * 1024 * 1024;
  const totalBytes = (files || []).reduce((sum, f) => sum + (f?.fileSize || 0), 0);
  const percentage = Math.min(100, Math.round((totalBytes / limitBytes) * 100));
  const freePercent = 100 - percentage;

  const pdfBytes = (files || []).filter((f) => f?.fileType === 'pdf').reduce((s, f) => s + (f?.fileSize || 0), 0);
  const imgBytes = (files || []).filter((f) => f?.fileType === 'image').reduce((s, f) => s + (f?.fileSize || 0), 0);
  const docBytes = (files || []).filter((f) => f?.fileType === 'docx').reduce((s, f) => s + (f?.fileSize || 0), 0);
  const otherBytes = totalBytes - pdfBytes - imgBytes - docBytes;

  const STORAGE_BREAKDOWN = [
    { id: 'storage-pdf', label: 'PDF-Dokumente', value: formatMB(pdfBytes), color: 'bg-danger/70' },
    { id: 'storage-img', label: 'Bilder', value: formatMB(imgBytes), color: 'bg-primary/70' },
    { id: 'storage-doc', label: 'Word-Dateien', value: formatMB(docBytes), color: 'bg-warning/70' },
    { id: 'storage-other', label: 'Sonstige', value: formatMB(otherBytes), color: 'bg-muted-foreground/40' },
  ];

  return (
    <div className="bg-card rounded-xl border border-border shadow-card h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Speichernutzung</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Frankfurt · EU-Central-1
        </p>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-5">
        {/* Chart */}
        <StorageChartInner percentage={percentage} />

        {/* Stats */}
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatMB(totalBytes)}
          </p>
          <p className="text-xs text-muted-foreground">von {storageLimitGb} GB genutzt</p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{percentage}% verwendet</span>
            <span>{freePercent}% frei</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full progress-bar"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          {STORAGE_BREAKDOWN?.map((item) => (
            <div key={item?.id} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${item?.color}`} />
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {item?.label}
              </span>
              <span className="text-xs font-medium text-foreground tabular-nums">
                {item?.value}
              </span>
            </div>
          ))}
        </div>

        {/* File count note */}
        <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2 border border-border">
          <TrendingUp size={13} className="text-accent flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {(files || []).length} Datei{(files || []).length !== 1 ? 'en' : ''} gespeichert
          </p>
        </div>
      </div>
    </div>
  );
}