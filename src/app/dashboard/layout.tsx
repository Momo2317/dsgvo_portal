'use client';

import { AccountProvider } from '@/contexts/AccountContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountProvider>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </AccountProvider>
  );
}
