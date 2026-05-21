'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { workspaceService } from '@/lib/services/portalService';
import {
  Menu,
  Bell,
  Copy,
  CheckCircle2,
  ExternalLink,
  Shield,
  LogOut,
} from 'lucide-react';

interface TopbarProps {
  onMobileMenuToggle: () => void;
}

export default function DashboardTopbar({ onMobileMenuToggle }: TopbarProps) {
  const [copied, setCopied] = useState(false);
  const [portalSlug, setPortalSlug] = useState<string | null>(null);
  const { signOut, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    workspaceService.getMyWorkspace().then((ws) => {
      if (ws?.slug) setPortalSlug(ws.slug);
    }).catch(() => {});
  }, []);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const portalUrl = portalSlug ? `${siteUrl}/u/${portalSlug}` : '';
  const displayUrl = portalSlug ? `${siteUrl.replace('https://', '')}/u/${portalSlug}` : 'Wird geladen...';

  const handleCopy = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Portal-URL in die Zwischenablage kopiert');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/sign-up-login-screen');
      router.refresh();
    } catch (err: any) {
      toast.error(`Abmeldung fehlgeschlagen: ${err?.message}`);
    }
  };

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'KM';

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
      {/* Mobile menu */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
      >
        <Menu size={20} />
      </button>

      {/* Portal URL bar */}
      <div className="flex-1 flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2 max-w-md">
          <Shield size={13} className="text-accent flex-shrink-0" />
          <span className="text-xs text-muted-foreground font-mono truncate">
            {displayUrl}
          </span>
          <button
            onClick={handleCopy}
            className="p-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
            title="URL kopieren"
          >
            {copied ? (
              <CheckCircle2 size={13} className="text-accent" />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>

        {portalSlug && (
          <a
            href={`/u/${portalSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink size={12} />
            Vorschau
          </a>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/dashboard/notifications')}
          className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
          title="Benachrichtigungen"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>

        <button
          onClick={handleSignOut}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
          title="Abmelden"
        >
          <LogOut size={18} />
        </button>

        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors">
          <span className="text-xs font-bold text-primary">{initials}</span>
        </div>
      </div>
    </header>
  );
}