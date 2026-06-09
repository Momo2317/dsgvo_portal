'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  workspaceService,
  type Workspace,
} from '@/lib/services/portalService';

const ACTIVE_WS_KEY = 'tresorlink_active_workspace_id';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pickActive = useCallback((list: Workspace[]) => {
    if (!list.length) {
      setActiveWorkspaceState(null);
      return;
    }
    const storedId =
      typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_WS_KEY) : null;
    const match = storedId ? list.find((w) => w.id === storedId) : null;
    setActiveWorkspaceState(match || list[0]);
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await workspaceService.getMyWorkspaces();
      setWorkspaces(list);
      pickActive(list);
    } catch (err: any) {
      setError(err?.message || 'Portale konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [pickActive]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const setActiveWorkspace = useCallback((workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_WS_KEY, workspace.id);
    }
  }, []);

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      loading,
      error,
      setActiveWorkspace,
      refreshWorkspaces,
    }),
    [workspaces, activeWorkspace, loading, error, setActiveWorkspace, refreshWorkspaces]
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}
