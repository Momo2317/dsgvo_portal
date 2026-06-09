'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Download,
  Trash2,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  FileText,
  FileImage,
  File,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Files,
} from 'lucide-react';
import DeleteConfirmModal from './DeleteConfirmModal';
import { fileService } from '@/lib/services/portalService';
import type { UploadedFile } from '@/lib/services/portalService';

interface FileTableProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

type SortField = 'fileName' | 'fileSize' | 'createdAt' | 'expiresAt' | 'status';
type SortDir = 'asc' | 'desc';

const FILE_ICONS = {
  pdf: FileText,
  image: FileImage,
  docx: File,
  other: File,
};

const FILE_ICON_COLORS = {
  pdf: 'text-danger',
  image: 'text-primary',
  docx: 'text-primary',
  other: 'text-muted-foreground',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysUntilExpiry(expiresAt: string | null): number {
  if (!expiresAt) return 99;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toUpperCase() || 'FILE';
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  const days = getDaysUntilExpiry(expiresAt);
  if (days <= 2) {
    return (
      <span className="badge-expired inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full">
        <AlertTriangle size={10} />
        {days}T
      </span>
    );
  }
  if (days <= 5) {
    return (
      <span className="badge-expiring inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full">
        <Clock size={10} />
        {days}T
      </span>
    );
  }
  return (
    <span className="badge-fresh inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full">
      {days}T
    </span>
  );
}

function StatusBadge({ status }: { status: UploadedFile['status'] }) {
  if (status === 'new') {
    return (
      <span className="badge-fresh inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        Neu
      </span>
    );
  }
  return (
    <span className="badge-downloaded inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full">
      <CheckCircle2 size={10} />
      Heruntergeladen
    </span>
  );
}

export default function FileTable({ files, onFilesChange }: FileTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'downloaded'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<UploadedFile | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = (files || [])
    .filter((f) => {
      const matchSearch = f?.fileName?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || f?.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'fileName') cmp = (a?.fileName || '').localeCompare(b?.fileName || '');
      else if (sortField === 'fileSize') cmp = (a?.fileSize || 0) - (b?.fileSize || 0);
      else if (sortField === 'createdAt')
        cmp = new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
      else if (sortField === 'expiresAt')
        cmp = getDaysUntilExpiry(a?.expiresAt || null) - getDaysUntilExpiry(b?.expiresAt || null);
      else if (sortField === 'status') cmp = (a?.status || '').localeCompare(b?.status || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const allSelected =
    paginated.length > 0 && paginated.every((f) => selectedIds.has(f.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((f) => f.id)));
    }
  };

  const handleDelete = async (file: UploadedFile) => {
    setIsDeleting(true);
    try {
      await fileService.deleteFile(file.id, file.storagePath);
      onFilesChange(files.filter((f) => f.id !== file.id));
      setDeleteTarget(null);
      toast.success(`"${file.fileName}" wurde gelöscht`);
    } catch (err: any) {
      toast.error(`Fehler beim Löschen: ${err?.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const toDelete = files.filter((f) => selectedIds.has(f.id));
    try {
      await fileService.deleteFiles(toDelete.map((f) => ({ id: f.id, storagePath: f.storagePath })));
      onFilesChange(files.filter((f) => !selectedIds.has(f.id)));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      toast.success(`${toDelete.length} Dateien wurden gelöscht`);
    } catch (err: any) {
      toast.error(`Fehler beim Löschen: ${err?.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const url = await fileService.getDownloadUrl(file.storagePath);

      // Try fetch+blob first (works on mobile for cross-origin signed URLs)
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('fetch failed');
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      } catch {
        // Fallback: open in new tab (works on all devices)
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      await fileService.markDownloaded(file.id);
      onFilesChange(
        files.map((f) => (f.id === file.id ? { ...f, status: 'downloaded' as const } : f))
      );
      toast.success(`Download von "${file.fileName}" gestartet`);
    } catch (err: any) {
      toast.error(`Download fehlgeschlagen: ${err?.message}`);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return (
        <ChevronUp
          size={12}
          className="text-muted-foreground/40 group-hover:text-muted-foreground"
        />
      );
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-primary" />
    ) : (
      <ChevronDown size={12} className="text-primary" />
    );
  };

  return (
    <>
      <div className="ui-card overflow-hidden">
        {/* Table header */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground">
              Empfangene Dateien
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} Dateien · {(files || []).filter((f) => f?.status === 'new').length} neu
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Datei suchen..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-48 lg:w-56"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as typeof statusFilter);
                  setPage(1);
                }}
                className="pl-8 pr-7 py-2 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none cursor-pointer transition-all"
              >
                <option value="all">Alle Status</option>
                <option value="new">Neu</option>
                <option value="downloaded">Heruntergeladen</option>
              </select>
            </div>

            <button
              onClick={() => toast.info('Dateien werden aktualisiert...')}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              title="Aktualisieren"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="slide-up bg-primary/5 border-b border-primary/20 px-4 py-2.5 flex items-center gap-3">
            <span className="text-sm font-semibold text-primary">
              {selectedIds.size} ausgewählt
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger text-danger-foreground text-xs font-semibold rounded-lg hover:bg-danger/90 active:scale-[0.97] transition-all"
            >
              <Trash2 size={13} />
              Auswahl löschen
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Abbrechen
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('fileName')}
                    className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground group transition-colors"
                  >
                    Dateiname
                    <SortIcon field="fileName" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left hidden md:table-cell">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Typ
                  </span>
                </th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">
                  <button
                    onClick={() => handleSort('fileSize')}
                    className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground group transition-colors"
                  >
                    Größe
                    <SortIcon field="fileSize" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground group transition-colors"
                  >
                    Hochgeladen
                    <SortIcon field="createdAt" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('expiresAt')}
                    className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground group transition-colors"
                  >
                    Ablauf
                    <SortIcon field="expiresAt" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground group transition-colors"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left hidden 2xl:table-cell">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Hash
                  </span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Aktionen
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Files size={40} className="text-muted-foreground/30" />
                      <p className="text-sm font-semibold text-foreground">
                        Keine Dateien gefunden
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {search || statusFilter !== 'all' ?'Keine Dateien entsprechen Ihren Filterkriterien.' :'Teilen Sie Ihren Portal-Link mit Mandanten, um Dateien zu empfangen.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((file) => {
                  const FileIcon = FILE_ICONS[file?.fileType] || File;
                  const iconColor = FILE_ICON_COLORS[file?.fileType] || 'text-muted-foreground';
                  const isSelected = selectedIds.has(file.id);
                  const daysLeft = getDaysUntilExpiry(file?.expiresAt || null);
                  return (
                    <tr
                      key={file.id}
                      className={`group transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'
                      } ${daysLeft <= 2 ? 'bg-warning/5 hover:bg-warning/10' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(file.id)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${iconColor}`}
                          >
                            <FileIcon size={15} />
                          </div>
                          <span className="text-sm font-medium text-foreground truncate max-w-[180px] lg:max-w-[240px]">
                            {file?.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 hidden md:table-cell">
                        <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {getFileExtension(file?.fileName || '')}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {formatBytes(file?.fileSize || 0)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(file?.createdAt || '')}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <ExpiryBadge expiresAt={file?.expiresAt || null} />
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={file?.status} />
                      </td>
                      <td className="px-3 py-3.5 hidden 2xl:table-cell">
                        <span className="text-xs font-mono text-muted-foreground">
                          {file?.fileHash?.substring(0, 8) || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title="Datei herunterladen"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(file)}
                            className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                            title="Datei löschen"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Zeige {(page - 1) * perPage + 1}–
                {Math.min(page * perPage, filtered.length)} von{' '}
                {filtered.length} Dateien
              </span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                {[5, 8, 10, 20].map((n) => (
                  <option key={`perpage-${n}`} value={n}>
                    {n} pro Seite
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                «
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
                )
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 py-1 text-xs text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      onClick={() => setPage(p as number)}
                      className={`px-2.5 py-1 text-xs border rounded transition-all ${
                        page === p
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted text-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete single file modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          fileName={deleteTarget.fileName}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          isLoading={isDeleting}
        />
      )}

      {/* Bulk delete modal */}
      {bulkDeleteOpen && (
        <DeleteConfirmModal
          fileName={`${selectedIds.size} Dateien`}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
          isBulk
          isLoading={isDeleting}
        />
      )}
    </>
  );
}