'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { DeadlineBanner } from './DeadlineBanner';
import { MobileHeader } from './MobileHeader';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // A tela de login não usa o chrome do app (sidebar, banner, header).
  if (pathname === '/login') return <>{children}</>;

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
