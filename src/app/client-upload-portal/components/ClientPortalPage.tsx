'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import {
  Upload,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  FileImage,
  File,
  Trash2,
  Clock,
  ArrowRight,
  Info,
  Loader2,
} from 'lucide-react';
import { workspaceService, brandingService, fileService } from '@/lib/services/portalService';
import type { Workspace, BrandingSettings } from '@/lib/services/portalService';

// Plan-based file size limits (fetched from branding/workspace context)
// Default to Starter limits (20MB) for safety; portal owner's plan determines actual limit
const DEFAULT_MAX_SIZE_MB = 20;
const DEFAULT_MAX_SIZE_BYTES = DEFAULT_MAX_SIZE_MB * 1024 * 1024;

interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'docx' | 'other';
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTENSIONS = ['PDF', 'JPEG', 'JPG', 'PNG', 'DOCX'];

function getFileType(file: File): UploadFile['type'] {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.includes('wordprocessingml')) return 'docx';
  return 'other';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

interface ClientPortalPageProps {
  slug: string;
}

export default function ClientPortalPage({ slug }: ClientPortalPageProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [portalLoading, setPortalLoading] = useState(true);
  const [portalNotFound, setPortalNotFound] = useState(false);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(DEFAULT_MAX_SIZE_MB);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState(DEFAULT_MAX_SIZE_BYTES);

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPortal = async () => {
      try {
        setPortalLoading(true);
        const ws = await workspaceService.getWorkspaceBySlug(slug);
        if (!ws) {
          setPortalNotFound(true);
          return;
        }
        setWorkspace(ws);
        const br = await brandingService.getBranding(ws.id);
        setBranding(br);

        // Fetch plan limits for this workspace owner
        try {
          const res = await fetch(`/api/portal-limits?workspaceId=${ws.id}`);
          if (res.ok) {
            const limits = await res.json();
            if (limits.maxFileSizeMb && limits.maxFileSizeMb > 0) {
              setMaxFileSizeMb(limits.maxFileSizeMb);
              setMaxFileSizeBytes(limits.maxFileSizeMb * 1024 * 1024);
            } else if (limits.maxFileSizeMb === -1) {
              // Unlimited — set a very high practical limit
              setMaxFileSizeMb(5000);
              setMaxFileSizeBytes(5000 * 1024 * 1024);
            }
          }
        } catch {
          // Use defaults if limits fetch fails
        }
      } catch {
        setPortalNotFound(true);
      } finally {
        setPortalLoading(false);
      }
    };
    loadPortal();
  }, [slug]);

  const validateAndAddFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      const fileArray = Array.from(rawFiles);
      const rejected: string[] = [];
      const valid: UploadFile[] = [];

      fileArray.forEach((file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          rejected.push(`${file.name} — Nicht unterstütztes Dateiformat`);
          return;
        }
        if (file.size > maxFileSizeBytes) {
          rejected.push(`${file.name} — Datei überschreitet ${maxFileSizeMb} MB Limit (${formatBytes(file.size)})`);
          return;
        }
        const id = `upload-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        valid.push({
          id,
          file,
          name: file.name,
          size: formatBytes(file.size),
          type: getFileType(file),
          progress: 0,
          status: 'pending',
        });
      });

      setRejectedFiles(rejected);
      setFiles((prev) => [...prev, ...valid]);
    },
    [maxFileSizeBytes, maxFileSizeMb]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        validateAndAddFiles(e.dataTransfer.files);
      }
    },
    [validateAndAddFiles]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    if (!workspace) return;
    const autoDeleteDays = branding?.autoDeleteDays || 14;

    setFiles((prev) =>
      prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))
    );

    try {
      await fileService.uploadFile(
        workspace.id,
        workspace.slug,
        uploadFile.file,
        autoDeleteDays,
        (progress) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, progress, status: progress === 100 ? 'done' : 'uploading' }
                : f
            )
          );
        }
      );
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', errorMsg: err?.message || 'Upload fehlgeschlagen' }
            : f
        )
      );
      throw err;
    }
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploadState('uploading');

    try {
      await Promise.all(pendingFiles.map((f) => uploadSingleFile(f)));
      setUploadState('success');
    } catch {
      setUploadState('error');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setUploadState('idle');
    setRejectedFiles([]);
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;

  const companyName = branding?.portalTitle?.split('—')[0]?.trim() || 'Sicheres Upload-Portal';
  const portalTitle = branding?.portalTitle || 'Sicherer Dateiupload';
  const welcomeMsg = branding?.welcomeMessage || 'Laden Sie Ihre Dokumente hier sicher und DSGVO-konform hoch. Kein Login erforderlich.';
  const autoDeleteDays = branding?.autoDeleteDays || 14;
  const accentColor = branding?.accentColor || '#1a56db';

  // Use custom domain if configured, otherwise fall back to default portal URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const portalBaseUrl = branding?.customDomain
    ? `https://${branding.customDomain}`
    : `${siteUrl}/u/${slug}`;

  if (portalLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Portal wird geladen...</p>
        </div>
      </div>
    );
  }

  if (portalNotFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Portal nicht gefunden</h1>
          <p className="text-sm text-muted-foreground">
            Dieses Upload-Portal existiert nicht oder wurde deaktiviert. Bitte überprüfen Sie den Link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="Firmenlogo" className="w-10 h-10 object-contain rounded-lg" />
            ) : (
              <div className="w-10 h-10 rounded-lg border flex items-center justify-center" style={{ backgroundColor: `${accentColor}1a`, borderColor: `${accentColor}33` }}>
                <span className="text-sm font-bold" style={{ color: accentColor }}>
                  {workspace?.slug?.substring(0, 2).toUpperCase() || 'KM'}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-foreground">{companyName}</p>
              <p className="text-xs text-muted-foreground">Sicheres Datei-Upload-Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border" style={{ backgroundColor: `${accentColor}1a`, color: accentColor, borderColor: `${accentColor}33` }}>
              <Shield size={11} />
              DSGVO-konform
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-medium px-2.5 py-1.5 rounded-full border border-border">
              <Lock size={11} />
              TLS 1.3
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-2xl">

          {/* SUCCESS STATE */}
          {uploadState === 'success' && (
            <div className="fade-in text-center">
              <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${accentColor}1a`, borderColor: `${accentColor}4d` }}>
                <CheckCircle2 size={36} style={{ color: accentColor }} />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Dateien erfolgreich und sicher übertragen.
              </h1>
              <p className="text-muted-foreground text-sm mb-2 max-w-md mx-auto">
                Ihre {doneCount} Datei{doneCount !== 1 ? 'en wurden' : ' wurde'} verschlüsselt an{' '}
                <strong className="text-foreground">{companyName}</strong> übermittelt.
              </p>
              <p className="text-xs text-muted-foreground mb-8 max-w-sm mx-auto">
                Die Dateien werden nach {autoDeleteDays} Tagen automatisch gelöscht. Sie müssen keine weiteren Schritte unternehmen.
              </p>

              {/* Uploaded file list */}
              <div className="bg-card border border-border rounded-xl overflow-hidden mb-8 text-left">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2" style={{ backgroundColor: `${accentColor}0d` }}>
                  <CheckCircle2 size={14} style={{ color: accentColor }} />
                  <span className="text-sm font-semibold text-foreground">
                    Erfolgreich übertragen
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {files.filter((f) => f.status === 'done').map((file) => {
                    const FileIcon = FILE_ICONS[file.type];
                    const iconColor = FILE_ICON_COLORS[file.type];
                    return (
                      <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                          <FileIcon size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.size}</p>
                        </div>
                        <CheckCircle2 size={16} style={{ color: accentColor }} className="flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-lg active:scale-[0.97] transition-all"
                style={{ backgroundColor: accentColor }}
              >
                <Upload size={15} />
                Weitere Dateien hochladen
              </button>

              {/* DSGVO notice */}
              <div className="mt-10 bg-muted/60 border border-border rounded-xl p-4 text-left">
                <div className="flex items-start gap-3">
                  <Shield size={16} className="flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">
                      Datenschutzhinweis (DSGVO Art. 13)
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ihre Dateien werden ausschließlich zur Bearbeitung Ihres Anliegens durch{' '}
                      <strong className="text-foreground">{companyName}</strong> verarbeitet.
                      Es werden keine personenbezogenen Daten über Sie gespeichert.
                      Die Dateien werden nach {autoDeleteDays} Tagen automatisch und unwiderruflich gelöscht.
                      Server-Standort: Frankfurt, Deutschland (EU-Central-1).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* UPLOAD STATE (idle / uploading) */}
          {uploadState !== 'success' && (
            <>
              {/* Page title */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">{portalTitle}</h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{welcomeMsg}</p>
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                {[
                  { icon: Shield, label: 'DSGVO-konform' },
                  { icon: Lock, label: 'Ende-zu-Ende verschlüsselt' },
                  { icon: Clock, label: `Auto-Löschung nach ${autoDeleteDays} Tagen` },
                ].map((item) => (
                  <div
                    key={`trust-${item.label}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5"
                  >
                    <item.icon size={11} style={{ color: accentColor }} />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Rejected files warning */}
              {rejectedFiles.length > 0 && (
                <div className="mb-4 bg-danger/5 border border-danger/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-danger mb-1">
                        {rejectedFiles.length} Datei{rejectedFiles.length !== 1 ? 'en' : ''} abgelehnt
                      </p>
                      <ul className="space-y-0.5">
                        {rejectedFiles.map((msg, idx) => (
                          <li key={`rejected-${idx}`} className="text-xs text-danger/80">{msg}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => setRejectedFiles([])}
                      className="text-danger/60 hover:text-danger transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => uploadState !== 'uploading' && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                  isDragOver ? 'border-current' : 'border-border hover:border-current/50'
                } ${uploadState === 'uploading' ? 'pointer-events-none opacity-60' : ''}`}
                style={isDragOver ? { borderColor: accentColor, backgroundColor: `${accentColor}0d` } : {}}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={uploadState === 'uploading'}
                />

                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all"
                  style={{ backgroundColor: isDragOver ? `${accentColor}33` : `${accentColor}1a` }}
                >
                  <Upload
                    size={28}
                    style={{ color: accentColor, opacity: isDragOver ? 1 : 0.7 }}
                  />
                </div>

                {isDragOver ? (
                  <p className="text-base font-bold" style={{ color: accentColor }}>Dateien hier ablegen</p>
                ) : (
                  <>
                    <p className="text-base font-semibold text-foreground mb-1">
                      Dateien hierher ziehen
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">oder klicken zum Auswählen</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {ALLOWED_EXTENSIONS.map((ext) => (
                        <span
                          key={`ext-${ext}`}
                          className="text-xs font-mono font-semibold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded"
                        >
                          {ext}
                        </span>
                      ))}
                      <span className="text-xs text-muted-foreground">· max. {maxFileSizeMb >= 5000 ? 'unbegrenzt' : `${maxFileSizeMb} MB`} pro Datei</span>
                    </div>
                  </>
                )}
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-5 bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {files.length} Datei{files.length !== 1 ? 'en' : ''} ausgewählt
                      </span>
                      {uploadingCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          · {doneCount} von {files.length} abgeschlossen
                        </span>
                      )}
                    </div>
                    {uploadState === 'idle' && (
                      <button
                        onClick={() => setFiles([])}
                        className="text-xs text-muted-foreground hover:text-danger transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Alle entfernen
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-border max-h-72 overflow-y-auto">
                    {files.map((file) => {
                      const FileIcon = FILE_ICONS[file.type];
                      const iconColor = FILE_ICON_COLORS[file.type];
                      return (
                        <div key={file.id} className="px-4 py-3 file-row-enter">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                              <FileIcon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs text-muted-foreground tabular-nums">{file.size}</span>
                                  {file.status === 'done' && <CheckCircle2 size={15} style={{ color: accentColor }} />}
                                  {file.status === 'error' && <AlertCircle size={15} className="text-danger" />}
                                  {file.status === 'pending' && uploadState === 'idle' && (
                                    <button
                                      onClick={() => removeFile(file.id)}
                                      className="p-0.5 text-muted-foreground hover:text-danger transition-colors"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar */}
                              {(file.status === 'uploading' || file.status === 'done') && (
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full progress-bar"
                                    style={{
                                      width: `${file.progress}%`,
                                      backgroundColor: file.status === 'done' ? accentColor : accentColor,
                                    }}
                                  />
                                </div>
                              )}

                              {file.status === 'pending' && (
                                <p className="text-xs text-muted-foreground">Bereit zum Hochladen</p>
                              )}
                              {file.status === 'error' && (
                                <p className="text-xs text-danger">
                                  {file.errorMsg || 'Upload fehlgeschlagen. Bitte erneut versuchen.'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload button */}
              {files.length > 0 && uploadState !== 'uploading' && (
                <div className="mt-5">
                  <button
                    onClick={handleUpload}
                    disabled={pendingCount === 0}
                    className="w-full py-3 text-white text-sm font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-card-hover"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Lock size={16} />
                    {pendingCount} Datei{pendingCount !== 1 ? 'en' : ''} sicher hochladen
                    <ArrowRight size={16} />
                  </button>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Verschlüsselt übertragen · Kein Login erforderlich
                  </p>
                </div>
              )}

              {/* Uploading state message */}
              {uploadState === 'uploading' && (
                <div className="mt-5 text-center">
                  <div className="inline-flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2.5 border" style={{ color: accentColor, backgroundColor: `${accentColor}0d`, borderColor: `${accentColor}33` }}>
                    <Loader2 size={16} className="animate-spin" />
                    Dateien werden sicher übertragen...
                  </div>
                </div>
              )}

              {/* DSGVO info box */}
              <div className="mt-8 bg-muted/60 border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info size={15} className="flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">
                      Datenschutz & Datensparsamkeit (DSGVO Art. 5)
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Es werden keine personenbezogenen Daten über Sie erfasst. Keine IP-Adresse, kein Standort, kein Tracking.
                      Ihre Dateien werden AES-256 verschlüsselt auf Servern in Frankfurt, Deutschland gespeichert und nach{' '}
                      {autoDeleteDays} Tagen automatisch und unwiderruflich gelöscht.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-5">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AppLogo size={24} />
            <span className="text-xs text-muted-foreground">Betrieben von TresorLink</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Server: Frankfurt · EU-Central-1</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-primary cursor-pointer hover:underline">Datenschutzerklärung</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-primary cursor-pointer hover:underline">Impressum</span>
          </div>
        </div>
      </footer>
    </div>
  );
}