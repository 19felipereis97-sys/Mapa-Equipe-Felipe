'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Professional, Team, TaxRegime, Level, Obligation, AccountingYear } from '@/types/entities';

interface AppContextValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  // Gaveta de navegação mobile — estado efêmero (nunca persiste em localStorage,
  // sempre reseta ao trocar de rota), propositalmente separado de sidebarCollapsed
  // que é uma preferência de desktop persistida.
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;

  professionals: Professional[];
  teams: Team[];
  taxRegimes: TaxRegime[];
  levels: Level[];
  obligations: Obligation[];
  accountingYears: AccountingYear[];
  activeYear: AccountingYear | null;

  isLoading: boolean;
  refreshAppData: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}

const SIDEBAR_KEY = 'mapa-equipe-sidebar-collapsed';

async function fetchJson<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [taxRegimes, setTaxRegimes] = useState<TaxRegime[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [accountingYears, setAccountingYears] = useState<AccountingYear[]>([]);
  const [activeYear, setActiveYearState] = useState<AccountingYear | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) setSidebarCollapsedState(stored === 'true');
  }, []);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setSidebarCollapsedState(v);
    localStorage.setItem(SIDEBAR_KEY, String(v));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const openMobileNav = useCallback(() => setMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((v) => !v), []);

  const refreshAppData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profs, tms, taxes, lvls, obs, years] = await Promise.all([
        fetchJson<Professional>('/api/professionals'),
        fetchJson<Team>('/api/teams'),
        fetchJson<TaxRegime>('/api/tax-regimes'),
        fetchJson<Level>('/api/levels'),
        fetchJson<Obligation>('/api/obligations'),
        fetchJson<AccountingYear>('/api/accounting-years'),
      ]);
      setProfessionals(profs.filter((p) => p.active));
      setTeams(tms.filter((t) => t.active));
      setTaxRegimes(taxes.filter((t) => t.active));
      setLevels(lvls.filter((l) => l.active));
      setObligations(obs.filter((o) => o.active));
      setAccountingYears(years.sort((a, b) => b.year - a.year));
      setActiveYearState(years.find((y) => y.active) ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshAppData(); }, [refreshAppData]);

  return (
    <AppContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        mobileNavOpen,
        openMobileNav,
        closeMobileNav,
        toggleMobileNav,
        professionals,
        teams,
        taxRegimes,
        levels,
        obligations,
        accountingYears,
        activeYear,
        isLoading,
        refreshAppData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
