'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Copy,
  CheckCircle2,
  ExternalLink,
  Shield,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface TopbarProps {
  onMobileMenuToggle: () => void;
}

export default function DashboardTopbar({ onMobileMenuToggle }: TopbarProps) {
  const [copied, setCopied] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const router = useRouter();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const portalSlug = activeWorkspace?.slug || null;
  const portalUrl = portalSlug ? `${siteUrl}/u/${portalSlug}` : '';
  const displayUrl = portalSlug
    ? `${siteUrl.replace('https://', '')}/u/${portalSlug}`
    : 'Wird geladen...';

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
    <header className="sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
      >
        <Menu size={20} />
      </button>

      {workspaces.length > 1 && (
        <div className="relative hidden md:block">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-border rounded-lg bg-muted hover:bg-muted/80 max-w-[200px]"
          >
            <span className="truncate">
              {activeWorkspace?.name || activeWorkspace?.slug || 'Portal'}
            </span>
            <ChevronDown size={14} className="flex-shrink-0" />
          </button>
          {switcherOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-card border border-border rounded-lg shadow-modal py-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setSwitcherOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                      ws.id === activeWorkspace?.id ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    {ws.name || ws.slug}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setSwitcherOpen(false);
                    router.push('/dashboard/portals');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-muted border-t border-border"
                >
                  Alle Portale verwalten
                </button>
              </div>
            </>
          )}
        </div>
      )}

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
