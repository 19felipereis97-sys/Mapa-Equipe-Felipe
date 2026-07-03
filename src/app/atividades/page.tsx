'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAppContext } from '@/context/AppContext';
import { ANNUAL_OBLIGATIONS } from '@/types/rules';
import type { EligibleCompanyResult } from '@/types/rules';
import type { ActivityStatus } from '@/types/entities';
import { ActivityGrid, buildStatusMap, MONTH_ABBR, MONTHS_1_12 } from '@/components/atividades/ActivityGrid';
import type { CellClickInfo } from '@/components/atividades/ActivityGrid';
import { SPEDGrid } from '@/components/atividades/SPEDGrid';
import { StatusSelector, STATUS_CFG } from '@/components/atividades/StatusSelector';
import { ObservationModal } from '@/components/atividades/ObservationModal';
import { BulkActionBar } from '@/components/atividades/BulkActionBar';
import { KanbanView } from '@/components/atividades/KanbanView';
import { TravaAbertoModal } from '@/components/atividades/TravaContabilModal';
import type { TravaRequester } from '@/components/atividades/TravaContabilModal';
import { getCompetenceMonth } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

/* ─── Tab definitions ─── */
interface TabItem  { code: string; label: string }
interface TabGroup { label?: string; items: TabItem[] }
const TAB_GROUPS: TabGroup[] = [
  { items: [{ code: 'dp', label: 'DP' }] },
  { label: 'FISCAL', items: [
    { code: 'fiscal_simples', label: 'Simples' },
    { code: 'fiscal_icms',    label: 'ICMS'    },
    { code: 'fiscal_servico', label: 'Serviço' },
  ]},
  { items: [
    { code: 'financeiro', label: 'Financeiro' },
    { code: 'analise',    label: 'Análise'    },
    { code: 'revisao',    label: 'Revisão'    },
    { code: 'distribuicao_lucros', label: 'Distrib. Lucros' },
    { code: 'ir_aluguel', label: 'IR Aluguel' },
    { code: 'mit',        label: 'MIT'        },
    { code: 'cotas_irpj_csll', label: 'Cotas IRPJ/CSLL' },
  ]},
  { label: 'SPED', items: [
    { code: 'sped_ecd', label: 'ECD' },
    { code: 'sped_ecf', label: 'ECF' },
  ]},
  { label: 'CONTÁBIL', items: [
    { code: 'trava_contabil', label: 'Trava Contábil' },
  ]},
];

/* Available statuses per obligation */
const OBL_STATUSES: Record<string, string[]> = {
  dp:             ['OK','S/M','P','ST-I'],
  fiscal_simples: ['OK','S/M','P','ST-I'],
  fiscal_icms:    ['OK','S/M','P','ST-I'],
  fiscal_servico: ['OK','S/M','P','ST-I'],
  financeiro:     ['OK','S/M','P','ST-C'],
  analise:        ['OK','S/M','P','ST-C'],
  revisao:        ['OK','S/M','P','ST-C'],
  distribuicao_lucros: ['OK','S/M','ST-C'],
  ir_aluguel:     ['OK','S/M','P','ST-C'],
  mit:            ['OK','S/M','P','ST-C'],
  cotas_irpj_csll: ['OK','PREJUIZO','COTA_UNICA'],
  sped_ecd:       ['OK','P'],
  sped_ecf:       ['OK','P'],
  trava_contabil: ['OK','ABERTO'],
};

/* ─── Obligation tabs ─── */
function ObligationTabs({ active, onChange }: { active: string; onChange: (code: string) => void }) {
  const divider = <span style={{ width: 1, height: 20, background: 'var(--border-color)', flexShrink: 0, margin: '0 4px', alignSelf: 'center' }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--border-color)', marginBottom: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {TAB_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && divider}
          {group.label && (
            <>{' '}<span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-placeholder)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 6px', flexShrink: 0, alignSelf: 'center', userSelect: 'none' }}>{group.label}</span>{divider}</>
          )}
          {group.items.map((item) => {
            const isActive = active === item.code;
            return (
              <button key={item.code} onClick={() => onChange(item.code)} style={{ padding: '13px 10px', background: 'none', border: 'none', borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-family)', lineHeight: 1 }}>
                {item.label}
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Status legend ─── */
function StatusLegend({ availableStatuses }: { availableStatuses: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      {availableStatuses.map((s) => {
        const c = STATUS_CFG[s];
        if (!c) return null;
        return (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-block', background: c.bg, color: c.color, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>{c.label}</span>
          </span>
        );
      })}
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-placeholder)', marginLeft: 4 }}>
        — = não preenchido · Clique para selecionar status
      </span>
    </div>
  );
}

/* ─── Pending save state ─── */
interface PendingSave {
  companyId: number;
  companyName: string;
  month: number;
  status: string;
  rect: DOMRect;
  currentStatus: string | null;
  currentObs: string | null;
}

/* ─── Excel download helper ─── */
async function triggerExcelDownload(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro ao gerar Excel' }));
    throw new Error(err.error ?? 'Erro ao gerar Excel');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

/* ─── LocalStorage keys ─── */
const LS_OBL  = 'mapa:atividades:obligation';
const LS_YEAR = 'mapa:atividades:year';

/* ─── Page ─── */
export default function AtividadesPage() {
  const { addToast }                          = useToast();
  const { accountingYears, activeYear }       = useAppContext();
  const currentMonth                          = getCompetenceMonth();

  const [obligation, setObligation]           = useState('dp');
  const [year, setYear]                       = useState('');
  const [includeTerminated, setIncludeTerminated] = useState(false);
  const [onlyTerminated, setOnlyTerminated]   = useState(false);

  const [results, setResults]                 = useState<EligibleCompanyResult[]>([]);
  const [statuses, setStatuses]               = useState<ActivityStatus[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [updating, setUpdating]               = useState(false);
  const hasLoadedRef = useRef(false);
  const [error, setError]                     = useState<string | null>(null);

  // Cache em memória por aba (obrigação+ano+filtros) desta sessão — evita
  // refazer as 2 requisições de rede toda vez que se volta pra uma aba já
  // visitada. Ver plano de performance (services/obligationService.ts +
  // este arquivo) para o contexto completo.
  const tabCacheRef = useRef<Map<string, { results: EligibleCompanyResult[]; statuses: ActivityStatus[] }>>(new Map());
  const tabCacheKey = useCallback(
    (obl: string, yr: string, incTerm: boolean, onlyTerm: boolean) => `${obl}:${yr}:${incTerm}:${onlyTerm}`,
    []
  );

  const [search, setSearch]                   = useState('');
  const [filterResp, setFilterResp]           = useState('');
  const [filterGroup, setFilterGroup]         = useState('');
  const [filterType, setFilterType]           = useState('');
  const [filterLevel, setFilterLevel]         = useState('');
  const [filterTax, setFilterTax]             = useState('');
  const [selected, setSelected]               = useState<Set<number>>(new Set());
  const [bulkMonths, setBulkMonths]           = useState<number[]>([currentMonth]);

  // Status selector
  const [selectorInfo, setSelectorInfo]       = useState<CellClickInfo | null>(null);
  // Observation modal
  const [obsModal, setObsModal]               = useState<PendingSave | null>(null);
  // Bulk observation modal
  const [bulkObsStatus, setBulkObsStatus]     = useState<string | null>(null);
  // Trava Contábil — modal de abertura
  const [travaAberto, setTravaAberto]         = useState<{ company: EligibleCompanyResult; month: number } | null>(null);
  // Excel loading
  const [excelLoading, setExcelLoading]               = useState(false);
  const [excelCompleteLoading, setExcelCompleteLoading] = useState(false);
  // PDF report loading
  const [pdfLoading, setPdfLoading] = useState(false);
  // Kanban
  const [viewMode, setViewMode]   = useState<'grade' | 'kanban'>('grade');
  const isMobile = useIsMobile();
  // A grade de 12 meses não cabe de forma legível em tela de celular — força Kanban.
  const effectiveViewMode = isMobile ? 'kanban' : viewMode;
  const [kanbanMonth, setKanbanMonth] = useState(currentMonth);

  useEffect(() => {
    if (activeYear && !year) setYear(String(activeYear.year));
  }, [activeYear, year]);

  // Read query params on mount (deep-linking from Dashboard), fall back to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');
    const ano  = params.get('ano');
    const mes  = params.get('mes');
    const allCodes = TAB_GROUPS.flatMap((g) => g.items).map((i) => i.code);
    if (tipo && allCodes.includes(tipo)) {
      setObligation(tipo);
    } else {
      const stored = localStorage.getItem(LS_OBL);
      if (stored && allCodes.includes(stored)) setObligation(stored);
    }
    if (ano) {
      setYear(ano);
    } else {
      const storedYear = localStorage.getItem(LS_YEAR);
      if (storedYear) setYear(storedYear);
    }
    if (mes) { const m = parseInt(mes, 10); if (m >= 1 && m <= 12) setKanbanMonth(m); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist selected obligation and year to localStorage
  useEffect(() => { if (obligation) localStorage.setItem(LS_OBL, obligation); }, [obligation]);
  useEffect(() => { if (year) localStorage.setItem(LS_YEAR, year); }, [year]);

  /* ─── Excel export ─── */
  async function handleExcelSingle() {
    if (!year || !obligation) return;
    setExcelLoading(true);
    try {
      const onlyTerm = onlyTerminated ? 'true' : 'false';
      const params = new URLSearchParams({ obligation, year, onlyTerminated: onlyTerm });
      const filename = `${obligation}_${year}.xlsx`;
      await triggerExcelDownload(`/api/export/activities?${params}`, filename);
      addToast({ type: 'success', message: 'Excel gerado com sucesso.' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao gerar Excel' });
    } finally { setExcelLoading(false); }
  }

  async function handleExcelComplete() {
    if (!year) return;
    setExcelCompleteLoading(true);
    try {
      const onlyTerm = onlyTerminated ? 'true' : 'false';
      const params = new URLSearchParams({ year, onlyTerminated: onlyTerm });
      const filename = `atividades_completo_${year}.xlsx`;
      await triggerExcelDownload(`/api/export/activities/complete?${params}`, filename);
      addToast({ type: 'success', message: 'Excel completo gerado com sucesso.' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao gerar Excel completo' });
    } finally { setExcelCompleteLoading(false); }
  }

  async function handlePdfReport() {
    if (!year) return;
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({ month: String(currentMonth), year });
      const res = await fetch(`/api/reports/activities?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao gerar relatório' }));
        throw new Error(err.error ?? 'Erro ao gerar relatório');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const MONTH_ABBR_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
      a.download = `relatorio_${MONTH_ABBR_PT[currentMonth - 1]}_${year}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: 'Relatório PDF gerado com sucesso.' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao gerar relatório' });
    } finally { setPdfLoading(false); }
  }

  /* ─── Load ─── */
  const loadStatuses = useCallback(async (obl: string, yr: string) => {
    if (!obl || !yr) return;
    try {
      const res = await fetch(`/api/activities?obligationCode=${obl}&year=${yr}`);
      const json = await res.json();
      if (json.success) {
        const data = json.data ?? [];
        setStatuses(data);
        // Mantém o cache da aba em dia após uma edição individual/em lote —
        // senão trocar de aba e voltar mostraria o estado anterior à edição.
        const key = tabCacheKey(obl, yr, includeTerminated, onlyTerminated);
        const cached = tabCacheRef.current.get(key);
        tabCacheRef.current.set(key, { results: cached?.results ?? [], statuses: data });
      }
    } catch { /* non-critical */ }
  }, [includeTerminated, onlyTerminated, tabCacheKey]);

  const doSearch = useCallback(async (obl: string, yr: string, incTerm: boolean, onlyTerm: boolean) => {
    if (!obl || !yr) return;
    const key = tabCacheKey(obl, yr, incTerm, onlyTerm);
    const cached = tabCacheRef.current.get(key);

    if (cached) {
      // Já carregado nesta sessão — exibe na hora, sem esperar a rede, e
      // revalida em segundo plano (barra de "atualizando" discreta) abaixo.
      setResults(cached.results);
      setStatuses(cached.statuses);
      setSelected(new Set());
      hasLoadedRef.current = true;
    } else if (!hasLoadedRef.current) {
      setLoading(true);
    }
    setUpdating(true);
    setError(null);
    try {
      const params = new URLSearchParams({ obligation: obl, year: yr, includeTerminated: String(incTerm), onlyTerminated: String(onlyTerm) });
      const [resultsRes] = await Promise.all([fetch(`/api/rules/eligible?${params}`), loadStatuses(obl, yr)]);
      const json = await resultsRes.json();
      if (!json.success) throw new Error(json.error);
      const newResults = json.data ?? [];
      setResults(newResults);
      if (!cached) setSelected(new Set());
      const cachedStatuses = tabCacheRef.current.get(key)?.statuses ?? [];
      tabCacheRef.current.set(key, { results: newResults, statuses: cachedStatuses });
    } catch (e: unknown) {
      if (!cached) {
        setError(e instanceof Error ? e.message : 'Erro ao buscar empresas');
        setResults([]);
      }
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setUpdating(false);
    }
  }, [loadStatuses, tabCacheKey]);

  useEffect(() => {
    if (obligation && year) doSearch(obligation, year, includeTerminated, onlyTerminated);
  }, [obligation, year, includeTerminated, onlyTerminated, doSearch]);

  /* ─── Derived ─── */
  const isAnnual = ANNUAL_OBLIGATIONS.includes(obligation as typeof ANNUAL_OBLIGATIONS[number]);
  const availableStatuses = OBL_STATUSES[obligation] ?? ['OK','P'];
  const activeTab = TAB_GROUPS.flatMap((g) => g.items).find((i) => i.code === obligation);
  const statusMap = useMemo(() => buildStatusMap(statuses), [statuses]);

  // SPED map: companyId → ActivityStatus (month=0)
  const spedMap = useMemo(() => {
    const m = new Map<number, ActivityStatus>();
    for (const s of statuses) { if (s.month === 0) m.set(s.companyId, s); }
    return m;
  }, [statuses]);

  /* ─── Progress for current month / obligation ─── */
  const currentMonthProgress = useMemo(() => {
    if (isAnnual) {
      const total = results.length;
      const done  = results.filter((r) => { const s = spedMap.get(r.companyId); return s?.status === 'OK' || s?.status === 'S/M'; }).length;
      return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    }
    const eligible = results.filter((r) => r.months[currentMonth - 1]?.eligible);
    const total    = eligible.length;
    const done     = eligible.filter((r) => {
      const s = statusMap.get(r.companyId)?.get(currentMonth);
      return s?.status === 'OK' || s?.status === 'S/M' || s?.status === 'PREJUIZO' || s?.status === 'COTA_UNICA';
    }).length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [results, statusMap, spedMap, currentMonth, isAnnual]);

  /* ─── Filters ─── */
  const availableResps = useMemo(() => {
    const seen = new Map<number, string>();
    for (const r of results) { if (r.responsible) seen.set(r.responsible.id, r.responsible.name); }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  const availableGroups = useMemo(() => {
    const seen = new Set<string>();
    for (const r of results) { if (r.groupName) seen.add(r.groupName); }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [results]);

  const availableLevels = useMemo(() => {
    const seen = new Map<number, string>();
    for (const r of results) { if (r.level) seen.set(r.level.id, r.level.name); }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  const availableTaxes = useMemo(() => {
    const seen = new Map<number, string>();
    for (const r of results) { if (r.taxRegime) seen.set(r.taxRegime.id, r.taxRegime.name); }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  const filtered = useMemo(() => results.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (![r.corporateName, r.groupName, r.code].some((f) => f?.toLowerCase().includes(q))) return false;
    }
    if (filterResp  && r.responsible?.id  !== Number(filterResp))  return false;
    if (filterGroup && r.groupName        !== filterGroup)          return false;
    if (filterType  && r.companyType      !== filterType)           return false;
    if (filterLevel && r.level?.id        !== Number(filterLevel))  return false;
    if (filterTax   && r.taxRegime?.id    !== Number(filterTax))    return false;
    return true;
  }), [results, search, filterResp, filterGroup, filterType, filterLevel, filterTax]);

  const hasFilters = !!(search || filterResp || filterGroup || filterType || filterLevel || filterTax);

  /* ─── Selection ─── */
  const eligibleIds = useMemo(
    () => filtered.filter((r) => bulkMonths.some((m) => r.months[m - 1]?.eligible)).map((r) => r.companyId),
    [filtered, bulkMonths]
  );
  const toggleOne   = (id: number) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll   = () => setSelected(eligibleIds.every((id) => selected.has(id)) ? new Set() : new Set(eligibleIds));

  function toggleBulkMonth(m: number) {
    setBulkMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)));
  }
  function toggleAllBulkMonths() {
    setBulkMonths((prev) => (prev.length === 12 ? [] : [...MONTHS_1_12]));
  }

  /* ─── Optimistic save helpers ─── */
  function applyOptimistic(companyId: number, month: number, status: string, observation: string | null, responsibleId: number | null) {
    setStatuses((prev) => {
      const next = prev.filter((s) => !(s.companyId === companyId && s.month === month));
      const placeholder: ActivityStatus = { id: -Date.now(), companyId, obligationId: 0, year: Number(year), month, status, observation, responsibleId, createdAt: '', updatedAt: '' };
      return [...next, placeholder];
    });
  }
  function revertOptimistic(companyId: number, month: number, prev: ActivityStatus | undefined) {
    setStatuses((cur) => {
      const next = cur.filter((s) => !(s.companyId === companyId && s.month === month));
      return prev ? [...next, prev] : next;
    });
  }

  async function saveStatus(companyId: number, month: number, status: string, observation: string | null, responsibleId: number | null) {
    const prev = statusMap.get(companyId)?.get(month) ?? spedMap.get(companyId);
    applyOptimistic(companyId, month, status, observation, responsibleId);
    try {
      const res = await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, obligationCode: obligation, year: Number(year), month, status, observation, responsibleId }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setStatuses((cur) => { const next = cur.filter((s) => !(s.companyId === companyId && s.month === month)); return [...next, json.data]; });
      // Cotas IRPJ/CSLL: marking Cota Única/Prejuízo (or clearing one) changes which
      // months are blocked for the following two — re-run eligibility to pick that up.
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year, includeTerminated, onlyTerminated);
    } catch (e: unknown) {
      revertOptimistic(companyId, month, prev);
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao salvar status' });
    }
  }

  async function clearStatus(companyId: number, month: number) {
    const prev = statusMap.get(companyId)?.get(month) ?? spedMap.get(companyId);
    if (!prev) return;
    setStatuses((cur) => cur.filter((s) => !(s.companyId === companyId && s.month === month)));
    try {
      const res = await fetch('/api/activities', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, obligationCode: obligation, year: Number(year), month }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year, includeTerminated, onlyTerminated);
    } catch (e: unknown) {
      setStatuses((cur) => [...cur, prev]);
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao limpar status' });
    }
  }

  /* ─── Trava Contábil — cascata de OK (preenche meses anteriores) ─── */
  async function handleTravaOK(company: EligibleCompanyResult, clickedMonth: number) {
    const monthsToFill = company.months
      .filter((m) => m.month <= clickedMonth && m.eligible)
      .map((m) => m.month);

    if (monthsToFill.length === 0) return;

    // Optimistic update
    for (const m of monthsToFill) applyOptimistic(company.companyId, m, 'OK', null, null);

    try {
      const items = monthsToFill.map((m) => ({
        companyId: company.companyId,
        obligationCode: 'trava_contabil',
        year: Number(year),
        month: m,
        status: 'OK',
        observation: null,
        responsibleId: null,
      }));
      const res = await fetch('/api/activities/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await loadStatuses('trava_contabil', year);
    } catch (e: unknown) {
      for (const m of monthsToFill) {
        const prev = statusMap.get(company.companyId)?.get(m);
        revertOptimistic(company.companyId, m, prev);
      }
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao salvar trava' });
    }
  }

  /* ─── Trava Contábil — cascata de ABERTO (M em diante fica aberto, anteriores ficam com OK) ─── */
  async function handleTravaAbertoConfirm(requester: TravaRequester) {
    if (!travaAberto) return;
    const { company, month: clickedMonth } = travaAberto;
    setTravaAberto(null);

    const observation = `Solicitado por: ${requester}`;
    // Mês clicado e todos os posteriores elegíveis viram ABERTO
    const monthsToFill = company.months
      .filter((m) => m.month >= clickedMonth && m.eligible)
      .map((m) => m.month);

    if (monthsToFill.length === 0) return;

    for (const m of monthsToFill) applyOptimistic(company.companyId, m, 'ABERTO', observation, null);

    try {
      const items = monthsToFill.map((m) => ({
        companyId: company.companyId,
        obligationCode: 'trava_contabil',
        year: Number(year),
        month: m,
        status: 'ABERTO',
        observation,
        responsibleId: null,
      }));
      const res = await fetch('/api/activities/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await loadStatuses('trava_contabil', year);
    } catch (e: unknown) {
      for (const m of monthsToFill) {
        const prev = statusMap.get(company.companyId)?.get(m);
        revertOptimistic(company.companyId, m, prev);
      }
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao abrir trava' });
    }
  }

  /* ─── Cell click → selector ─── */
  function handleCellClick(info: CellClickInfo) {
    setSelectorInfo(info);
  }

  function handleSelectorSelect(status: string) {
    if (!selectorInfo) return;
    const info = selectorInfo;
    setSelectorInfo(null);

    // Trava Contábil — lógica especial com cascata
    if (obligation === 'trava_contabil') {
      if (status === 'OK') {
        handleTravaOK(info.company, info.month);
      } else if (status === 'ABERTO') {
        setTravaAberto({ company: info.company, month: info.month });
      }
      return;
    }

    const cfg = STATUS_CFG[status];
    if (cfg?.needsObs) {
      setObsModal({ companyId: info.company.companyId, companyName: info.company.corporateName, month: info.month, status, rect: info.rect, currentStatus: info.currentStatus, currentObs: info.currentObs });
    } else {
      saveStatus(info.company.companyId, info.month, status, null, info.company.responsible?.id ?? null);
    }
  }

  function handleSelectorClear() {
    if (!selectorInfo) return;
    setSelectorInfo(null);
    clearStatus(selectorInfo.company.companyId, selectorInfo.month);
  }

  /* ─── SPED cell click ─── */
  function handleSpedCellClick(company: EligibleCompanyResult, rect: DOMRect, currentStatus: string | null, currentObs: string | null) {
    setSelectorInfo({ company, month: 0, rect, currentStatus, currentObs });
  }

  /* ─── Observation modal confirm ─── */
  function handleObsConfirm(observation: string | null) {
    if (!obsModal) return;
    saveStatus(obsModal.companyId, obsModal.month, obsModal.status, observation, results.find((r) => r.companyId === obsModal.companyId)?.responsible?.id ?? null);
    setObsModal(null);
  }

  /* ─── Bulk apply ─── */
  function handleBulkApply(status: string) {
    const cfg = STATUS_CFG[status];
    if (cfg?.needsObs) { setBulkObsStatus(status); return; }
    executeBulkSave(status, null);
  }

  async function executeBulkSave(status: string, observation: string | null) {
    setBulkObsStatus(null);
    const items: { companyId: number; obligationCode: string; year: number; month: number; status: string; observation: string | null; responsibleId: number | null }[] = [];
    for (const id of Array.from(selected)) {
      const r = results.find((x) => x.companyId === id);
      if (!r) continue;
      for (const m of bulkMonths) {
        if (r.months[m - 1]?.eligible) {
          items.push({ companyId: id, obligationCode: obligation, year: Number(year), month: m, status, observation, responsibleId: r.responsible?.id ?? null });
        }
      }
    }
    if (items.length === 0) return;

    // Optimistic
    for (const item of items) applyOptimistic(item.companyId, item.month, item.status, item.observation, item.responsibleId);

    try {
      const res = await fetch('/api/activities/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast({ type: 'success', message: `${json.data.succeeded} status atualizado${json.data.succeeded !== 1 ? 's' : ''}` });
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year, includeTerminated, onlyTerminated);
      else await loadStatuses(obligation, year);
    } catch (e: unknown) {
      for (const item of items) {
        const prev = statusMap.get(item.companyId)?.get(item.month);
        revertOptimistic(item.companyId, item.month, prev);
      }
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro na operação em lote' });
    }
    setSelected(new Set());
  }

  async function handleBulkClear() {
    const items: { companyId: number; obligationCode: string; year: number; month: number }[] = [];
    for (const id of Array.from(selected)) {
      const r = results.find((x) => x.companyId === id);
      if (!r) continue;
      for (const m of bulkMonths) {
        if (r.months[m - 1]?.eligible && statusMap.get(id)?.get(m)) {
          items.push({ companyId: id, obligationCode: obligation, year: Number(year), month: m });
        }
      }
    }
    if (items.length === 0) { setSelected(new Set()); return; }

    for (const item of items) {
      const prev = statusMap.get(item.companyId)?.get(item.month);
      if (prev) setStatuses((cur) => cur.filter((s) => !(s.companyId === item.companyId && s.month === item.month)));
    }
    try {
      const res = await fetch('/api/activities/bulk', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast({ type: 'success', message: `${json.data.succeeded} status removido${json.data.succeeded !== 1 ? 's' : ''}` });
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year, includeTerminated, onlyTerminated);
      else await loadStatuses(obligation, year);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao limpar em lote' });
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year, includeTerminated, onlyTerminated);
      else await loadStatuses(obligation, year);
    }
    setSelected(new Set());
  }

  /* ─── Render ─── */
  const isSpedObligation = obligation === 'sped_ecd' || obligation === 'sped_ecf';

  const obsModalPeriod = obsModal
    ? isAnnual
      ? String(year)
      : `${MONTH_ABBR[obsModal.month - 1]}/${year}`
    : '';

  return (
    <div className="page-container print-page" style={{ paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Obrigações</h1>
          <p className="page-subtitle">Controle mensal por empresa</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Grade / Kanban toggle — some sentido só em desktop, a grade de 12 meses não cabe no celular */}
          {!isAnnual && !isMobile && (
            <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {(['grade','kanban'] as const).map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: '5px 12px', border: 'none', background: viewMode === mode ? 'var(--color-primary)' : 'var(--bg-card)', color: viewMode === mode ? '#fff' : 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: viewMode === mode ? 600 : 400 }}>
                  {mode === 'grade' ? '⊞ Grade' : '☰ Kanban'}
                </button>
              ))}
            </div>
          )}
          {effectiveViewMode === 'kanban' && !isAnnual && (
            <select className="form-select" style={{ width: 80, height: 34, fontSize: 'var(--font-size-sm)' }}
              value={kanbanMonth} onChange={(e) => setKanbanMonth(Number(e.target.value))}>
              {MONTH_ABBR.map((label, i) => <option key={i + 1} value={i + 1}>{label}</option>)}
            </select>
          )}
          <select className="form-select" style={{ width: 90, height: 34, fontSize: 'var(--font-size-sm)' }}
            value={year} onChange={(e) => setYear(e.target.value)}>
            {accountingYears.map((y) => <option key={y.id} value={String(y.year)}>{y.year}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', userSelect: 'none' }}>
            <input type="checkbox" checked={includeTerminated} onChange={(e) => { setIncludeTerminated(e.target.checked); if (e.target.checked) setOnlyTerminated(false); }} disabled={onlyTerminated} style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
            Incl. rescindidas
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', userSelect: 'none' }}>
            <input type="checkbox" checked={onlyTerminated} onChange={(e) => { setOnlyTerminated(e.target.checked); if (e.target.checked) setIncludeTerminated(false); }} style={{ accentColor: 'var(--color-warning)', cursor: 'pointer' }} />
            Só rescindidas
          </label>
          <button
            onClick={handleExcelSingle}
            disabled={excelLoading || !year}
            style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: excelLoading ? 'var(--text-placeholder)' : 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', cursor: excelLoading ? 'not-allowed' : 'pointer', opacity: excelLoading ? 0.7 : 1, fontFamily: 'var(--font-family)' }}
          >
            {excelLoading ? '⏳ Gerando…' : '⬇ Excel'}
          </button>
          <button
            onClick={handleExcelComplete}
            disabled={excelCompleteLoading || !year}
            style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: excelCompleteLoading ? 'var(--text-placeholder)' : 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', cursor: excelCompleteLoading ? 'not-allowed' : 'pointer', opacity: excelCompleteLoading ? 0.7 : 1, fontFamily: 'var(--font-family)' }}
          >
            {excelCompleteLoading ? '⏳ Gerando…' : '⬇ Excel completo'}
          </button>
          <button
            onClick={handlePdfReport}
            disabled={pdfLoading || !year}
            style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)', background: pdfLoading ? 'var(--bg-card)' : 'var(--color-primary-soft)', color: pdfLoading ? 'var(--text-placeholder)' : 'var(--color-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: pdfLoading ? 'not-allowed' : 'pointer', opacity: pdfLoading ? 0.7 : 1, fontFamily: 'var(--font-family)' }}
          >
            {pdfLoading ? '⏳ Gerando…' : '📄 Relatório PDF'}
          </button>
        </div>
      </div>

      {/* Print-only header info */}
      <div className="print-only" style={{ display: 'none', marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: '#374151' }}>Obrigação: <strong>{activeTab?.label ?? obligation}</strong> &nbsp;|&nbsp; Ano: <strong>{year}</strong></p>
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && !isAnnual && effectiveViewMode === 'grade' && (
        <div className="no-print">
          <BulkActionBar
            count={selected.size}
            months={bulkMonths}
            onToggleMonth={toggleBulkMonth}
            onToggleAllMonths={toggleAllBulkMonths}
            availableStatuses={availableStatuses}
            onApply={handleBulkApply}
            onClear={handleBulkClear}
            onCancel={() => setSelected(new Set())}
          />
        </div>
      )}

      {/* ── Card ── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>

        {/* Tabs */}
        <div className="no-print" style={{ padding: '0 14px' }}>
          <ObligationTabs active={obligation} onChange={(code) => { setObligation(code); setSelected(new Set()); setBulkMonths([currentMonth]); setSearch(''); setFilterResp(''); setFilterGroup(''); setFilterType(''); setFilterLevel(''); setFilterTax(''); }} />
        </div>
        {updating && (
          <div style={{ height: 2, background: 'var(--color-primary)', opacity: 0.45 }} />
        )}

        {loading ? (
          <div style={{ padding: 20 }}><LoadingState message="Aplicando regras de elegibilidade..." /></div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-danger)' }}>
            <p style={{ fontWeight: 600 }}>Erro ao processar regras</p>
            <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 4 }}>{error}</p>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              <input className="form-input" style={{ flex: '2 1 180px', height: 32, fontSize: 'var(--font-size-sm)' }} placeholder="Buscar empresa ou cód..." value={search} onChange={(e) => setSearch(e.target.value)} />
              {availableGroups.length > 0 && (
                <select className="form-select" style={{ flex: '1 1 130px', height: 32, fontSize: 'var(--font-size-sm)' }} value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
                  <option value="">Grupo</option>
                  {availableGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              <select className="form-select" style={{ flex: '1 1 110px', height: 32, fontSize: 'var(--font-size-sm)' }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Tipo</option>
                <option value="MATRIZ">Matriz</option>
                <option value="FILIAL">Filial</option>
              </select>
              {availableLevels.length > 0 && (
                <select className="form-select" style={{ flex: '1 1 110px', height: 32, fontSize: 'var(--font-size-sm)' }} value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
                  <option value="">Nível</option>
                  {availableLevels.map((l) => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
                </select>
              )}
              {availableTaxes.length > 0 && (
                <select className="form-select" style={{ flex: '1 1 140px', height: 32, fontSize: 'var(--font-size-sm)' }} value={filterTax} onChange={(e) => setFilterTax(e.target.value)}>
                  <option value="">Tributação</option>
                  {availableTaxes.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </select>
              )}
              <select className="form-select" style={{ flex: '1 1 130px', height: 32, fontSize: 'var(--font-size-sm)' }} value={filterResp} onChange={(e) => setFilterResp(e.target.value)}>
                <option value="">Responsável</option>
                {availableResps.map((r) => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
              </select>
              {hasFilters && (
                <button className="action-btn" style={{ height: 32, whiteSpace: 'nowrap' }} onClick={() => { setSearch(''); setFilterResp(''); setFilterGroup(''); setFilterType(''); setFilterLevel(''); setFilterTax(''); }}>Limpar</button>
              )}
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                {filtered.length} empresa{filtered.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => window.print()}
                style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
              >
                🖨 Imprimir
              </button>
            </div>

            {/* Status legend */}
            <div className="no-print" style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-color)' }}>
              <StatusLegend availableStatuses={availableStatuses} />
            </div>

            {/* Sub-header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>{activeTab?.label ?? obligation}</span>
              {isAnnual && <span className="badge badge-stc" style={{ fontSize: 'var(--font-size-xs)' }}>Anual</span>}
              {isSpedObligation && year && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Tributação considerada: {Number(year) - 1}</span>}
              {onlyTerminated && <span className="badge badge-danger" style={{ fontSize: 'var(--font-size-xs)' }}>Rescindidas</span>}
              {!loading && results.length > 0 && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {currentMonthProgress.done}/{currentMonthProgress.total}
                  </span>
                  <div style={{ width: 72, height: 5, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${currentMonthProgress.pct}%`, height: '100%', borderRadius: 3, transition: 'width 0.4s ease',
                      background: currentMonthProgress.pct >= 100 ? 'var(--color-success)' : currentMonthProgress.pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                    }} />
                  </div>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, minWidth: 34,
                    color: currentMonthProgress.pct >= 100 ? 'var(--color-success)' : currentMonthProgress.pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                    {currentMonthProgress.pct}%
                  </span>
                </div>
              )}
            </div>

            {/* Grid area */}
            {filtered.length === 0 ? (
              <div style={{ padding: '32px 14px' }}>
                <EmptyState
                  title={hasFilters ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa elegível'}
                  description={hasFilters ? 'Ajuste os filtros para encontrar empresas.' : 'Nenhuma empresa se enquadra nesta obrigação para o ano selecionado.'}
                />
              </div>
            ) : isAnnual ? (
              <SPEDGrid
                results={filtered}
                statusMap={spedMap}
                year={year}
                onCellClick={handleSpedCellClick}
              />
            ) : effectiveViewMode === 'kanban' ? (
              <KanbanView
                results={filtered}
                statusMap={statusMap}
                month={kanbanMonth}
                onCellClick={handleCellClick}
                search={search}
              />
            ) : (
              <ActivityGrid
                results={filtered}
                statusMap={statusMap}
                selected={selected}
                onToggle={toggleOne}
                onToggleAll={toggleAll}
                onCellClick={handleCellClick}
                currentMonth={currentMonth}
              />
            )}

            {/* Legend footer */}
            {!isAnnual && (
              <div className="no-print" style={{ display: 'flex', gap: 16, padding: '10px 14px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                {[
                  { label: 'Elegível — clique para marcar', render: <div style={{ width: 16, height: 10, borderRadius: 2, border: '1px solid var(--border-color)' }} /> },
                  { label: 'Bloqueado — início competência', render: <div style={{ width: 16, height: 10, borderRadius: 2, background: 'rgba(100,116,139,0.22)' }} /> },
                  { label: 'Bloqueado — rescisão', render: <div style={{ width: 16, height: 10, borderRadius: 2, background: 'repeating-linear-gradient(45deg,rgba(100,116,139,0.45) 0,rgba(100,116,139,0.45) 2px,transparent 2px,transparent 5px)' }} /> },
                ].map((item) => (
                  <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {item.render}{item.label}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── Status Selector popover ── */}
      {selectorInfo && (
        <StatusSelector
          rect={selectorInfo.rect}
          currentStatus={selectorInfo.currentStatus}
          availableStatuses={availableStatuses}
          onSelect={handleSelectorSelect}
          onClear={handleSelectorClear}
          onClose={() => setSelectorInfo(null)}
        />
      )}

      {/* ── Observation modal (single cell) ── */}
      <ObservationModal
        open={obsModal !== null}
        status={obsModal?.status ?? ''}
        companyName={obsModal?.companyName ?? ''}
        period={obsModalPeriod}
        initialObs={obsModal?.currentObs}
        onConfirm={handleObsConfirm}
        onCancel={() => setObsModal(null)}
      />

      {/* ── Observation modal (bulk) ── */}
      <ObservationModal
        open={bulkObsStatus !== null}
        status={bulkObsStatus ?? ''}
        companyName={`${selected.size} empresa${selected.size !== 1 ? 's' : ''} selecionada${selected.size !== 1 ? 's' : ''}`}
        period={`${MONTH_ABBR[currentMonth - 1]}/${year}`}
        initialObs={null}
        onConfirm={(obs) => executeBulkSave(bulkObsStatus!, obs)}
        onCancel={() => setBulkObsStatus(null)}
      />

      {/* ── Trava Contábil — modal de abertura ── */}
      <TravaAbertoModal
        open={travaAberto !== null}
        companyName={travaAberto?.company.corporateName ?? ''}
        month={travaAberto?.month ?? 1}
        year={year}
        onConfirm={handleTravaAbertoConfirm}
        onCancel={() => setTravaAberto(null)}
      />
    </div>
  );
}
