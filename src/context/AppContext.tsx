'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Professional, Team, TaxRegime, Level, Obligation, AccountingYear } from '@/types/entities';
import { apiFetch } from '@/lib/apiFetch';

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
    const res = await apiFetch(url);
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

// Cache dos dados cadastrais (dados pequenos e estáveis) para o boot ser
// instantâneo: hidrata da última cópia salva e revalida em segundo plano.
// v2: v1 podia gravar um blob vazio/malformado (ex.: falha transitória de rede)
// que travava o boot e deixava os selects vazios; v2 descarta qualquer cache antigo.
const CACHE_KEY = 'mapa:appdata:v2';
const CACHE_SHAPE = ['professionals', 'teams', 'taxRegimes', 'levels', 'obligations', 'accountingYears'] as const;

// Só aceita um cache com a forma esperada (todas as chaves presentes e sendo arrays).
// Qualquer coisa fora disso é ignorada para não travar/poluir o boot.
function readCache(): Record<string, unknown[]> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!CACHE_SHAPE.every((k) => Array.isArray(parsed[k]))) return null;
    return parsed as Record<string, unknown[]>;
  } catch { return null; }
}
function writeCache(data: Record<string, unknown[]>): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* quota/priv — ignora */ }
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

  const applyData = useCallback((d: {
    professionals: Professional[]; teams: Team[]; taxRegimes: TaxRegime[];
    levels: Level[]; obligations: Obligation[]; accountingYears: AccountingYear[];
  }) => {
    setProfessionals(d.professionals);
    setTeams(d.teams);
    setTaxRegimes(d.taxRegimes);
    setLevels(d.levels);
    setObligations(d.obligations);
    setAccountingYears(d.accountingYears);
    setActiveYearState(d.accountingYears.find((y) => y.active) ?? null);
  }, []);

  const refreshAppData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const [profs, tms, taxes, lvls, obs, years] = await Promise.all([
        fetchJson<Professional>('/api/professionals'),
        fetchJson<Team>('/api/teams'),
        fetchJson<TaxRegime>('/api/tax-regimes'),
        fetchJson<Level>('/api/levels'),
        fetchJson<Obligation>('/api/obligations'),
        fetchJson<AccountingYear>('/api/accounting-years'),
      ]);
      const processed = {
        professionals: profs.filter((p) => p.active),
        teams: tms.filter((t) => t.active),
        taxRegimes: taxes.filter((t) => t.active),
        levels: lvls.filter((l) => l.active),
        obligations: obs.filter((o) => o.active),
        accountingYears: years.sort((a, b) => b.year - a.year),
      };
      applyData(processed);
      writeCache(processed as unknown as Record<string, unknown[]>);
    } finally {
      setIsLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    // Hidrata instantaneamente da última cópia salva; revalida sem spinner.
    // A hidratação nunca pode impedir a revalidação: se o cache estiver
    // malformado, aplicá-lo pode lançar erro — por isso fica isolado num
    // try/catch e a revalidação (que é a fonte de verdade) roda em qualquer caso.
    const cached = readCache();
    let hydrated = false;
    if (cached) {
      try {
        applyData(cached as unknown as Parameters<typeof applyData>[0]);
        hydrated = true;
      } catch { /* cache inutilizável — ignora e busca do servidor com spinner */ }
    }
    void refreshAppData(!hydrated);
  }, [applyData, refreshAppData]);

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
