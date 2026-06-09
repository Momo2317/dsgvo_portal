'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  X,
  Upload,
  Palette,
  Globe,
  Save,
  Loader2,
  Eye,
  CheckCircle2,
  Link2,
  Pencil,
  Check,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { brandingService, workspaceService } from '@/lib/services/portalService';
import type { Workspace, BrandingSettings } from '@/lib/services/portalService';
import type { PlanLimits } from '@/lib/planLimits';
import { DEFAULT_BRAND_LOGO } from '@/lib/brand';

interface BrandingForm {
  portalTitle: string;
  welcomeMessage: string;
  accentColor: string;
  autoDeleteDays: string;
  notifyEmail: string;
  customDomain: string;
}

const PRESET_COLORS = [
  { id: 'color-blue', value: '#1a56db', label: 'Blau' },
  { id: 'color-green', value: '#0e9f6e', label: 'Grün' },
  { id: 'color-purple', value: '#7c3aed', label: 'Lila' },
  { id: 'color-slate', value: '#334155', label: 'Anthrazit' },
  { id: 'color-red', value: '#dc2626', label: 'Rot' },
  { id: 'color-amber', value: '#d97706', label: 'Amber' },
];

interface BrandingPanelProps {
  workspace: Workspace;
  branding: BrandingSettings | null;
  planLimits?: PlanLimits | null;
  onClose: () => void;
  onSaved: (branding: BrandingSettings, updatedWorkspace?: Workspace) => void;
}

export default function BrandingPanel({
  workspace,
  branding,
  planLimits,
  onClose,
  onSaved,
}: BrandingPanelProps) {
  const canUseCustomDomain = planLimits?.customDomain ?? false;
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    branding?.logoUrl || DEFAULT_BRAND_LOGO
  );
  const [useDefaultLogo, setUseDefaultLogo] = useState(!branding?.logoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [selectedColor, setSelectedColor] = useState(branding?.accentColor || '#1a56db');

  // Slug rename state
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState(workspace.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(workspace.slug);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<BrandingForm>({
    defaultValues: {
      portalTitle: branding?.portalTitle || 'Sicherer Dateiupload',
      welcomeMessage: branding?.welcomeMessage || 'Laden Sie Ihre Dokumente hier sicher und DSGVO-konform hoch.',
      accentColor: branding?.accentColor || '#1a56db',
      autoDeleteDays: String(branding?.autoDeleteDays || 14),
      notifyEmail: branding?.notifyEmail || '',
      customDomain: branding?.customDomain || '',
    },
  });

  // Keep selectedColor in sync with form value
  const watchedColor = watch('accentColor');
  useEffect(() => {
    setSelectedColor(watchedColor);
  }, [watchedColor]);

  const onSubmit = async (data: BrandingForm) => {
    setIsSaving(true);
    try {
      let logoUrl: string | null = useDefaultLogo ? null : branding?.logoUrl || null;
      if (logoFile) {
        logoUrl = await brandingService.uploadLogo(workspace.slug, logoFile);
        setUseDefaultLogo(false);
      } else if (useDefaultLogo) {
        logoUrl = null;
      }

      await brandingService.updateBranding(workspace.id, {
        portalTitle: data.portalTitle,
        welcomeMessage: data.welcomeMessage,
        accentColor: data.accentColor,
        autoDeleteDays: Number(data.autoDeleteDays),
        notifyEmail: data.notifyEmail || null,
        logoUrl,
        customDomain: canUseCustomDomain ? data.customDomain?.trim() || null : null,
      });

      toast.success('Portal-Einstellungen gespeichert');
      onSaved({
        id: branding?.id || '',
        workspaceId: workspace.id,
        portalTitle: data.portalTitle,
        welcomeMessage: data.welcomeMessage,
        accentColor: data.accentColor,
        autoDeleteDays: Number(data.autoDeleteDays),
        notifyEmail: data.notifyEmail || null,
        logoUrl,
        customDomain: canUseCustomDomain ? data.customDomain?.trim() || null : null,
      });
      onClose();
    } catch (err: any) {
      toast.error(`Fehler beim Speichern: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo-Datei darf maximal 2 MB groß sein');
      return;
    }
    setLogoFile(file);
    setUseDefaultLogo(false);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    toast.success('Logo-Vorschau aktualisiert');
  };

  const handleSlugSave = async () => {
    const trimmed = slugInput.trim();
    if (!trimmed || trimmed === currentSlug) {
      setIsEditingSlug(false);
      return;
    }
    setSlugError(null);
    setIsSavingSlug(true);
    try {
      const newSlug = await workspaceService.renameSlug(workspace.id, trimmed);
      setCurrentSlug(newSlug);
      setSlugInput(newSlug);
      setIsEditingSlug(false);
      toast.success('Portal-Link erfolgreich umbenannt');
      // Notify parent about slug change
      onSaved(
        {
          id: branding?.id || '',
          workspaceId: workspace.id,
          portalTitle: branding?.portalTitle || '',
          welcomeMessage: branding?.welcomeMessage || '',
          accentColor: branding?.accentColor || '#1a56db',
          autoDeleteDays: branding?.autoDeleteDays || 14,
          notifyEmail: branding?.notifyEmail || null,
          logoUrl: branding?.logoUrl || null,
        },
        { ...workspace, slug: newSlug }
      );
    } catch (err: any) {
      setSlugError(err?.message || 'Fehler beim Umbenennen');
    } finally {
      setIsSavingSlug(false);
    }
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const customDomain = canUseCustomDomain ? watch('customDomain')?.trim() : '';
  const portalUrl = customDomain
    ? `https://${customDomain}`
    : `${siteUrl}/u/${currentSlug}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ui-card rounded-xl shadow-modal w-full max-w-lg h-full max-h-[calc(100vh-2rem)] flex flex-col fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Portal-Einstellungen
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Passen Sie Ihr Upload-Portal an
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          <form id="branding-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Logo upload */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Logo
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Standardmäßig wird das TresorLink-Logo verwendet. Optional eigenes PNG/SVG (max. 2 MB).
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview || DEFAULT_BRAND_LOGO}
                    alt="Logo-Vorschau"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted cursor-pointer transition-all text-foreground w-fit">
                    <Upload size={15} />
                    Eigenes Logo hochladen
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                  {!useDefaultLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        setUseDefaultLogo(true);
                        setLogoFile(null);
                        setLogoPreview(DEFAULT_BRAND_LOGO);
                      }}
                      className="text-xs font-medium text-primary hover:underline text-left"
                    >
                      Standard-Logo verwenden
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Portal title */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Portal-Titel
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Wird als Überschrift auf der Upload-Seite angezeigt
              </p>
              <input
                type="text"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                  errors.portalTitle ? 'border-danger' : 'border-border'
                }`}
                {...register('portalTitle', {
                  required: 'Portal-Titel ist erforderlich',
                  maxLength: { value: 80, message: 'Maximal 80 Zeichen erlaubt' },
                })}
              />
              {errors.portalTitle && (
                <p className="text-danger text-xs mt-1">{errors.portalTitle.message}</p>
              )}
            </div>

            {/* Welcome message */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Begrüßungstext
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Kurze Erklärung für Ihre Kunden (max. 200 Zeichen)
              </p>
              <textarea
                rows={3}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none ${
                  errors.welcomeMessage ? 'border-danger' : 'border-border'
                }`}
                {...register('welcomeMessage', {
                  required: 'Begrüßungstext ist erforderlich',
                  maxLength: { value: 200, message: 'Maximal 200 Zeichen erlaubt' },
                })}
              />
              {errors.welcomeMessage && (
                <p className="text-danger text-xs mt-1">{errors.welcomeMessage.message}</p>
              )}
            </div>

            {/* Accent color */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Palette size={14} />
                Akzentfarbe
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Farbe für Buttons und Hervorhebungen im Upload-Portal
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedColor(preset.value);
                      setValue('accentColor', preset.value, { shouldDirty: true });
                    }}
                    className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${
                      selectedColor === preset.value
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:border-border'
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  >
                    {selectedColor === preset.value && (
                      <CheckCircle2 size={14} className="text-white" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => {
                    setSelectedColor(e.target.value);
                    setValue('accentColor', e.target.value, { shouldDirty: true });
                  }}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => {
                    setSelectedColor(e.target.value);
                    setValue('accentColor', e.target.value, { shouldDirty: true });
                  }}
                  className="w-28 px-2.5 py-1.5 text-xs font-mono border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="#1a56db"
                />
              </div>
            </div>

            {/* Auto-delete setting */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Automatische Löschung nach
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Gemäß DSGVO Datensparsamkeitsprinzip (Art. 5 Abs. 1 lit. e)
              </p>
              <select
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                {...register('autoDeleteDays')}
              >
                <option value="7">7 Tagen</option>
                <option value="14">14 Tagen (empfohlen)</option>
                <option value="30">30 Tagen</option>
                <option value="60">60 Tagen</option>
              </select>
            </div>

            {/* Notification email */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Globe size={14} />
                Benachrichtigungs-E-Mail
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Sie erhalten eine E-Mail bei neuen Datei-Uploads
              </p>
              <input
                type="email"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                  errors.notifyEmail ? 'border-danger' : 'border-border'
                }`}
                {...register('notifyEmail', {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Ungültige E-Mail-Adresse',
                  },
                })}
              />
              {errors.notifyEmail && (
                <p className="text-danger text-xs mt-1">{errors.notifyEmail.message}</p>
              )}
            </div>

            {/* Custom domain — Kanzlei+ only */}
            {canUseCustomDomain ? (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Globe size={14} />
                  Eigene Domain (optional)
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  z.B. upload.ihrefirma.de — der Portal-Link wird dann mit dieser Domain angezeigt.
                </p>
                <input
                  type="text"
                  placeholder="upload.ihrefirma.de"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  {...register('customDomain')}
                />
              </div>
            ) : (
              <div className="bg-muted/60 rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={14} className="text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Eigene Domain</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Im Starter-Plan nicht enthalten. Nutzen Sie Ihren TresorLink-Link unter /u/ihr-name.
                </p>
                <Link
                  href="/dashboard/billing"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Auf Kanzlei oder Premium upgraden →
                </Link>
              </div>
            )}

            {/* Portal URL with slug rename */}
            <div className="bg-muted/60 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={14} className="text-primary" />
                <p className="text-xs font-semibold text-foreground">
                  Ihr Portal-Link
                </p>
              </div>

              {/* Slug rename section */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Link-Name anpassen (nur Buchstaben, Zahlen und Bindestriche)
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono">
                    <span className="text-muted-foreground shrink-0">/u/</span>
                    {isEditingSlug ? (
                      <input
                        type="text"
                        value={slugInput}
                        onChange={(e) => {
                          setSlugInput(e.target.value);
                          setSlugError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleSlugSave(); }
                          if (e.key === 'Escape') { setIsEditingSlug(false); setSlugInput(currentSlug); setSlugError(null); }
                        }}
                        className="flex-1 bg-transparent outline-none text-foreground min-w-0"
                        autoFocus
                        placeholder="mein-portal"
                      />
                    ) : (
                      <span className="text-foreground">{currentSlug}</span>
                    )}
                  </div>
                  {isEditingSlug ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSlugSave}
                        disabled={isSavingSlug}
                        className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-all disabled:opacity-50"
                        title="Speichern"
                      >
                        {isSavingSlug ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsEditingSlug(false); setSlugInput(currentSlug); setSlugError(null); }}
                        className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-all"
                        title="Abbrechen"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingSlug(true)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                      title="Link-Name bearbeiten"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
                {slugError && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <AlertCircle size={12} className="text-danger" />
                    <p className="text-danger text-xs">{slugError}</p>
                  </div>
                )}
              </div>

              {/* Full URL display */}
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-muted-foreground bg-background border border-border rounded px-2.5 py-1.5 truncate">
                  {portalUrl}
                </code>
                <a
                  href={customDomain ? `https://${customDomain}` : `/u/${currentSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded-lg hover:bg-primary/10 transition-all whitespace-nowrap"
                >
                  <Eye size={12} />
                  Vorschau
                </a>
              </div>
            </div>
          </form>
        </div>

        {/* Sticky footer */}
        <div className="border-t border-border p-4 flex items-center gap-3 flex-shrink-0 bg-card">
          {isDirty && (
            <p className="text-xs text-warning flex items-center gap-1 flex-1">
              <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
              Nicht gespeicherte Änderungen
            </p>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-all text-foreground"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="branding-form"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Speichert...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Einstellungen speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}