'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Files,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Bell,
  HelpCircle,
  LogOut,
  X,
  CreditCard,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV_ITEMS = [
  {
    group: 'Übersicht',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
      { href: '/dashboard/files', icon: Files, label: 'Dateien', badge: null },
    ],
  },
  {
    group: 'Portal',
    items: [
      { href: '/dashboard/notifications', icon: Bell, label: 'Benachrichtigungen', badge: null },
    ],
  },
  {
    group: 'Verwaltung',
    items: [
      { href: '/dashboard/billing', icon: CreditCard, label: 'Abonnement', badge: null },
      { href: '/dashboard/settings', icon: Settings, label: 'Einstellungen', badge: null },
      { href: '/dashboard/compliance', icon: Shield, label: 'DSGVO & Compliance', badge: null },
      { href: '/dashboard/help', icon: HelpCircle, label: 'Hilfe & Support', badge: null },
    ],
  },
];

export default function DashboardSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const initials = user?.email?.substring(0, 2).toUpperCase() || '??';
  const email = user?.email || '';

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/sign-up-login-screen');
    } catch {}
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`flex items-center h-16 px-4 border-b border-border flex-shrink-0 ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} />
            <span className="font-bold text-base text-foreground tracking-tight">
              TresorLink
            </span>
          </div>
        )}
        {collapsed && <AppLogo size={32} />}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all ${
            collapsed ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {NAV_ITEMS.map((group) => (
          <div key={`group-${group.group}`} className="mb-5">
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={`nav-${item.href}`}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                      isActive
                        ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${isActive ? 'text-primary' : ''}`}
                    />
                    {!collapsed && (
                      <span className="flex-1">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-border p-3 flex-shrink-0">
        <div
          className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-1 text-muted-foreground hover:text-danger transition-colors"
              title="Abmelden"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-card border-r border-border flex-shrink-0 sidebar-transition shadow-sidebar ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border flex flex-col lg:hidden sidebar-transition shadow-modal ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}