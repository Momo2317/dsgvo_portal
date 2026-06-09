'use client';

import React from 'react';

type PageWidth = 'default' | 'content' | 'narrow';

const widthClass: Record<PageWidth, string> = {
  default: 'max-w-screen-2xl',
  content: 'max-w-5xl',
  narrow: 'max-w-3xl',
};

interface DashboardPageProps {
  children: React.ReactNode;
  width?: PageWidth;
}

export function DashboardPage({ children, width = 'default' }: DashboardPageProps) {
  return (
    <main>
      <div
        className={`${widthClass[width]} mx-auto px-4 lg:px-6 xl:px-8 py-6 space-y-6`}
      >
        {children}
      </div>
    </main>
  );
}

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  iconClassName?: string;
}

export function PageHeader({
  icon,
  title,
  description,
  action,
  iconClassName = 'bg-primary/10 text-primary',
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`page-icon ${iconClassName}`}>{icon}</div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
