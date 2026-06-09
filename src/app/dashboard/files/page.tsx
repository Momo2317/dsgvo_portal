'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import FileTable from '../components/FileTable';
import { DashboardPage, PageHeader } from '@/components/dashboard/DashboardPage';
import { fileService } from '@/lib/services/portalService';
import type { UploadedFile } from '@/lib/services/portalService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Loader2, Files } from 'lucide-react';

export default function FilesPage() {
  const { activeWorkspace, loading: wsLoading } = useWorkspace();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (wsLoading) return;
      if (!activeWorkspace) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const f = await fileService.getFiles(activeWorkspace.id);
        setFiles(f);
      } catch (err: any) {
        setError(err?.message || 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeWorkspace?.id, wsLoading]);

  return (
    <DashboardLayout>
      <DashboardPage>
        <PageHeader
          icon={<Files size={20} />}
          title="Dateien"
          description="Alle hochgeladenen Dokumente Ihrer Mandanten"
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="ui-card-padded text-center py-12">
            <p className="text-sm text-danger">{error}</p>
          </div>
        ) : (
          <FileTable files={files} onFilesChange={setFiles} />
        )}
      </DashboardPage>
    </DashboardLayout>
  );
}
