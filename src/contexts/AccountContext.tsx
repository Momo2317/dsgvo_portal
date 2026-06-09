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
  accountService,
  type TeamMembership,
} from '@/lib/services/accountService';

interface AccountContextValue {
  teamMembership: TeamMembership | null;
  isTeamMember: boolean;
  loading: boolean;
  refreshAccount: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [teamMembership, setTeamMembership] = useState<TeamMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccount = useCallback(async () => {
    try {
      setLoading(true);
      const membership = await accountService.getTeamMembership();
      setTeamMembership(membership);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  const value = useMemo(
    () => ({
      teamMembership,
      isTeamMember: Boolean(teamMembership),
      loading,
      refreshAccount,
    }),
    [teamMembership, loading, refreshAccount]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return ctx;
}
