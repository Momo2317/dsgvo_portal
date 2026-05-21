'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Bell, CheckCircle2, FileUp, Trash2, Clock, Mail, Settings } from 'lucide-react';
import { workspaceService, fileService, brandingService } from '@/lib/services/portalService';
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const ws = await workspaceService.getMyWorkspace();
        if (!ws) { setLoading(false); return; }

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
  }, []);

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
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Benachrichtigungen</h1>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alle gelesen'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-all"
              >
                <CheckCircle2 size={13} />
                Alle als gelesen markieren
              </button>
            )}
          </div>

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
            <div className="text-center py-20 bg-card border border-border rounded-2xl">
              <Bell size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground">Keine Benachrichtigungen</p>
              <p className="text-xs text-muted-foreground mt-1">Neue Uploads erscheinen hier</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
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
        </div>
      </main>
    </DashboardLayout>
  );
}
