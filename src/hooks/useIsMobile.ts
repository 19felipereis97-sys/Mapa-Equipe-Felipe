'use client';

import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 640px)';

// Retorna false no primeiro render (SSR e primeiro paint do cliente são sempre
// "desktop") e corrige 1 frame depois via matchMedia — mesmo trade-off que o
// sidebarCollapsed do AppContext já assume (lê localStorage só no useEffect).
export function useIsMobile(query: string = MOBILE_QUERY): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}
