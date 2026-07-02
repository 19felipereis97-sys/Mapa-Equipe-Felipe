'use client';

import { useContext } from 'react';
import { AppContext } from '@/context/AppContext';

export function useMobileNav() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useMobileNav must be used inside AppProvider');
  return {
    isOpen: ctx.mobileNavOpen,
    open: ctx.openMobileNav,
    close: ctx.closeMobileNav,
    toggle: ctx.toggleMobileNav,
  };
}
