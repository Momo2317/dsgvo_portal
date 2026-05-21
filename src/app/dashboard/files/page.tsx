'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import FileTable from '../components/FileTable';
import { workspaceService, fileService } from '@/lib/services/portalService';
import type { UploadedFile, Workspace } from '@/lib/services/portalService';
import { Loader2, Files } from 'lucide-react';

export default function FilesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const ws = await workspaceService.getMyWorkspace();
        if (!ws) { setLoading(false); return; }
        setWorkspace(ws);
        const f = await fileService.getFiles(ws.id);
        setFiles(f);
      } catch (err: any) {
        setError(err?.message || 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 xl:px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Files size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dateien</h1>
              <p className="text-sm text-muted-foreground">Alle hochgeladenen Dokumente Ihrer Mandanten</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-sm text-danger">{error}</p>
            </div>
          ) : (
            <FileTable
              files={files}
              onFilesChange={setFiles}
            />
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
