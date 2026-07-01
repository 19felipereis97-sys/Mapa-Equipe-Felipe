'use client';

import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  return (
    <main className="main-content" id="main-content">
      {children}
    </main>
  );
}
