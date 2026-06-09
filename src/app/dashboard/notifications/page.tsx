'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { DashboardPage, PageHeader } from '@/components/dashboard/DashboardPage';
import { Bell, CheckCircle2, FileUp, Trash2, Clock, Mail, Settings } from 'lucide-react';
import { fileService, brandingService } from '@/lib/services/portalService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'upload' | 'expiry' | 'delete';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function NotificationsPage() {
  const { activeWorkspace, loading: wsLoading } = useWorkspace();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (wsLoading) return;
      try {
        if (!activeWorkspace) { setLoading(false); return; }
        const ws = activeWorkspace;

        const [files, branding] = await Promise.all([
          fileService.getFiles(ws.id),
          brandingService.getBranding(ws.id),
        ]);

        setNotifyEmail(branding?.notifyEmail ?? null);

        const notifs: Notification[] = files.slice(0, 20).map((f) => {
          const isExpiringSoon = f.expiresAt
            ? new Date(f.expiresAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
            : false;
          return {
            id: f.id,
            type: isExpiringSoon ? 'expiry' : 'upload',
            title: isExpiringSoon ? 'Datei läuft bald ab' : 'Neue Datei erhalten',
            message: `${f.fileName} (${(f.fileSize / 1024 / 1024).toFixed(1)} MB)`,
            time: new Date(f.createdAt).toLocaleString('de-DE'),
            read: f.status === 'downloaded',
          };
        });
        setNotifications(notifs);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeWorkspace?.id, wsLoading]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const iconMap = {
    upload: <FileUp size={16} className="text-primary" />,
    expiry: <Clock size={16} className="text-warning" />,
    delete: <Trash2 size={16} className="text-danger" />,
  };

  return (
    <DashboardLayout>
      <DashboardPage width="narrow">
        <PageHeader
          icon={<Bell size={20} />}
          title="Benachrichtigungen"
          description={unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alle gelesen'}
          action={
            unreadCount > 0 ? (
              <button onClick={markAllRead} className="ui-btn-sm text-primary border border-primary/30 hover:bg-primary/5">
                <CheckCircle2 size={13} />
                Alle als gelesen markieren
              </button>
            ) : undefined
          }
        />

          {/* Email Notification Status Banner */}
          <div className={`flex items-start gap-3 p-4 rounded-xl border mb-6 ${
            notifyEmail
              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              notifyEmail ? 'bg-green-100 dark:bg-green-900/40' : 'bg-amber-100 dark:bg-amber-900/40'
            }`}>
              <Mail size={15} className={notifyEmail ? 'text-green-600' : 'text-amber-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${notifyEmail ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
                {notifyEmail ? 'E-Mail-Benachrichtigungen aktiv' : 'E-Mail-Benachrichtigungen nicht konfiguriert'}
              </p>
              <p className={`text-xs mt-0.5 ${notifyEmail ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {notifyEmail
                  ? `Bei jedem neuen Upload wird eine E-Mail an ${notifyEmail} gesendet.`
                  : 'Legen Sie eine Benachrichtigungs-E-Mail in den Portal-Einstellungen fest.'}
              </p>
            </div>
            {!notifyEmail && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 transition-all flex-shrink-0 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/30"
              >
                <Settings size={12} />
                Einrichten
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="ui-card-padded text-center py-16">
              <Bell size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground">Keine Benachrichtigungen</p>
              <p className="text-xs text-muted-foreground mt-1">Neue Uploads erscheinen hier</p>
            </div>
          ) : (
            <div className="ui-card-divided">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                    !n.read ? 'bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    {iconMap[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
      </DashboardPage>
    </DashboardLayout>
  );
}
