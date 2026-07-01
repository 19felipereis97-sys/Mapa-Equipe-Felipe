'use client';

import { useContext } from 'react';
import { AppContext } from '@/context/AppContext';

export function useSidebar() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useSidebar must be used inside AppProvider');
  return {
    isCollapsed: ctx.sidebarCollapsed,
    toggle: ctx.toggleSidebar,
  };
}
