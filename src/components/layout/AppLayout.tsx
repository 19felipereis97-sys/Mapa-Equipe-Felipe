'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { DeadlineBanner } from './DeadlineBanner';
import { MobileHeader } from './MobileHeader';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <DeadlineBanner />
      <div className="app-layout">
        <MobileHeader />
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </>
  );
}
