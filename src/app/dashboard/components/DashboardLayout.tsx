'use client';

import React, { useState } from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';
import DashboardContent from './DashboardContent';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div
        className={`flex flex-col min-h-screen transition-[padding] duration-300 ${
          sidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-60'
        }`}
      >
        <DashboardTopbar onMobileMenuToggle={() => setMobileSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto">
          {children ?? <DashboardContent />}
        </div>
      </div>
    </div>
  );
}
