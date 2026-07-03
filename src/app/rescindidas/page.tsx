'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
import type { Company, TaxRegime, Level } from '@/types/entities';
import { formatDocument } from '@/lib/masks';
import { getCompetenceMonth } from '@/lib/utils';

/* ─── Tab definitions (same as Atividades) ─── */
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
];

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

const PLACEHOLDER: React.CSSProperties = { color: 'var(--text-placeholder)' };

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function colorBadgeStyle(hex: string): React.CSSProperties {
  const rgb = hexToRgb(hex);
  if (!rgb) return {};
  return {
    background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`,
    color: hex,
    border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`,
  };
}

function CompanyTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const isMatriz = type.toUpperCase() === 'MATRIZ';
  const style: React.CSSProperties = isMatriz
    ? { background: 'var(--color-primary-soft)', color: 'var(--color-primary)', border: '1px solid rgba(37,99,235,0.25)' }
    : { background: '#FEF3C7', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)' };
  return (
    <span style={{ ...style, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em', whiteSpace: 'nowrap', verticalAlign: 'middle', flexShrink: 0 }}>
      {type.toUpperCase()}
    </span>
  );
}

function TaxBadge({ regime }: { regime: TaxRegime | null | undefined }) {
  if (!regime) return <span style={PLACEHOLDER}>—</span>;
  const extra = regime.color ? colorBadgeStyle(regime.color) : {
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  };
  return (
    <span style={{ ...extra, display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
      {regime.name}
    </span>
  );
}

function LevelChip({ company, levels }: { company: Company; levels: Level[] }) {
  const l = levels.find((x) => x.id === company.levelId);
  if (!l) return <span style={PLACEHOLDER}>—</span>;
  const chipStyle: React.CSSProperties = l.color
    ? { background: `${l.color}18`, color: l.color, border: `1px solid ${l.color}40` }
    : { background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
  return (
    <span style={{ ...chipStyle, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', borderRadius: 4, fontSize: 'var(--font-size-sm)', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {l.color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0 }} />}
      {l.name}
    </span>
  );
}

function RespCell({ prof }: { prof: { name: string } | null | undefined }) {
  if (!prof) return <span style={PLACEHOLDER}>—</span>;
  return <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{prof.name}</span>;
}

function OperacaoCell({ c }: { c: Company }) {
  const parts: string[] = [];
  if (c.operationService) parts.push('Serviço');
  if (c.operationCommerce) parts.push('Comércio');
  if (c.operationIndustry) parts.push('Indústria');
  if (parts.length === 0) return <span style={PLACEHOLDER}>—</span>;
  return <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{parts.join(', ')}</span>;
}

interface RevertTarget {
  id: number;
  corporateName: string;
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
async function triggerDownload(url: string, filename: string): Promise<void> {
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

/* ─── Page ─── */
export default function RescindadasPage() {
  const { addToast }                    = useToast();
  const { accountingYears, activeYear, levels, taxRegimes } = useAppContext();
  const currentMonth                    = getCompetenceMonth();

  const [obligation, setObligation]     = useState('dp');
  const [year, setYear]                 = useState('');
  const [companiesExpanded, setCompaniesExpanded] = useState(true);

  const [results, setResults]           = useState<EligibleCompanyResult[]>([]);
  const [statuses, setStatuses]         = useState<ActivityStatus[]>([]);
  const [loading, setLoading]           = useState(false);
  const [updating, setUpdating]         = useState(false);
  const hasLoadedRef = useRef(false);
  const [error, setError]               = useState<string | null>(null);

  // Cache em memória por aba (obrigação+ano) desta sessão — evita refazer as
  // 2 requisições de rede toda vez que se volta pra uma aba já visitada.
  const tabCacheRef = useRef<Map<string, { results: EligibleCompanyResult[]; statuses: ActivityStatus[] }>>(new Map());
  const [terminatedCompanies, setTerminatedCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companySearch, setCompanySearch] = useState('');

  const [search, setSearch]             = useState('');
  const [filterResp, setFilterResp]     = useState('');
  const [selected, setSelected]         = useState<Set<number>>(new Set());
  const [bulkMonths, setBulkMonths]     = useState<number[]>([currentMonth]);

  // Status selector
  const [selectorInfo, setSelectorInfo] = useState<CellClickInfo | null>(null);
  // Observation modal
  const [obsModal, setObsModal]         = useState<PendingSave | null>(null);
  // Bulk observation modal
  const [bulkObsStatus, setBulkObsStatus] = useState<string | null>(null);

  // Revert termination
  const [revertTarget, setRevertTarget] = useState<RevertTarget | null>(null);
  const [reverting, setReverting]       = useState(false);

  // Excel loading states
  const [excelLoading, setExcelLoading]           = useState(false);
  const [excelCompleteLoading, setExcelCompleteLoading] = useState(false);

  useEffect(() => {
    if (activeYear && !year) setYear(String(activeYear.year));
  }, [activeYear, year]);

  const loadTerminatedCompanies = useCallback(async (showInitialLoading = true) => {
    if (showInitialLoading) setCompaniesLoading(true);
    try {
      const res = await fetch('/api/companies?onlyTerminated=true');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setTerminatedCompanies(json.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar empresas rescindidas' });
    } finally {
      if (showInitialLoading) setCompaniesLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadTerminatedCompanies(); }, [loadTerminatedCompanies]);

  /* ─── Load statuses ─── */
  const loadStatuses = useCallback(async (obl: string, yr: string) => {
    if (!obl || !yr) return;
    try {
      const res = await fetch(`/api/activities?obligationCode=${obl}&year=${yr}`);
      const json = await res.json();
      if (json.success) {
        const data = json.data ?? [];
        setStatuses(data);
        // Mantém o cache da aba em dia após uma edição — senão trocar de aba
        // e voltar mostraria o estado anterior à edição.
        const key = `${obl}:${yr}`;
        const cached = tabCacheRef.current.get(key);
        tabCacheRef.current.set(key, { results: cached?.results ?? [], statuses: data });
      }
    } catch { /* non-critical */ }
  }, []);

  /* ─── Load companies (onlyTerminated = true) ─── */
  const doSearch = useCallback(async (obl: string, yr: string) => {
    if (!obl || !yr) return;
    const key = `${obl}:${yr}`;
    const cached = tabCacheRef.current.get(key);

    if (cached) {
      // Já carregado nesta sessão — exibe na hora e revalida em segundo plano.
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
      const params = new URLSearchParams({ obligation: obl, year: yr, onlyTerminated: 'true', includeTerminated: 'false' });
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
        setError(e instanceof Error ? e.message : 'Erro ao buscar empresas rescindidas');
        setResults([]);
      }
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setUpdating(false);
    }
  }, [loadStatuses]);

  useEffect(() => {
    if (obligation && year) doSearch(obligation, year);
  }, [obligation, year, doSearch]);

  /* ─── Derived ─── */
  const isAnnual = ANNUAL_OBLIGATIONS.includes(obligation as typeof ANNUAL_OBLIGATIONS[number]);
  const availableStatuses = OBL_STATUSES[obligation] ?? ['OK','P'];
  const activeTab = TAB_GROUPS.flatMap((g) => g.items).find((i) => i.code === obligation);
  const statusMap = useMemo(() => buildStatusMap(statuses), [statuses]);

  const spedMap = useMemo(() => {
    const m = new Map<number, ActivityStatus>();
    for (const s of statuses) { if (s.month === 0) m.set(s.companyId, s); }
    return m;
  }, [statuses]);

  /* ─── Filters ─── */
  const availableResps = useMemo(() => {
    const seen = new Map<number, string>();
    for (const r of results) { if (r.responsible) seen.set(r.responsible.id, r.responsible.name); }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  const filtered = useMemo(() => results.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (![r.corporateName, r.groupName, r.code].some((f) => f?.toLowerCase().includes(q))) return false;
    }
    if (filterResp && r.responsible?.id !== Number(filterResp)) return false;
    return true;
  }), [results, search, filterResp]);

  const hasFilters = !!(search || filterResp);

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return terminatedCompanies;
    return terminatedCompanies.filter((c) => (
      [c.corporateName, c.groupName, c.code, c.document, c.terminationMonth]
        .some((f) => f?.toLowerCase().includes(q))
    ));
  }, [terminatedCompanies, companySearch]);

  /* ─── Selection (only companies eligible in at least one chosen bulk month) ─── */
  const eligibleIds = useMemo(
    () => filtered.filter((r) => bulkMonths.some((m) => r.months[m - 1]?.eligible)).map((r) => r.companyId),
    [filtered, bulkMonths]
  );

  const toggleOne = (id: number) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(eligibleIds.every((id) => selected.has(id)) ? new Set() : new Set(eligibleIds));

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
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year);
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
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year);
    } catch (e: unknown) {
      setStatuses((cur) => [...cur, prev]);
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao limpar status' });
    }
  }

  /* ─── Cell click → selector ─── */
  function handleCellClick(info: CellClickInfo) {
    setSelectorInfo(info);
  }

  function handleSelectorSelect(status: string) {
    if (!selectorInfo) return;
    setSelectorInfo(null);
    const cfg = STATUS_CFG[status];
    if (cfg?.needsObs) {
      setObsModal({ companyId: selectorInfo.company.companyId, companyName: selectorInfo.company.corporateName, month: selectorInfo.month, status, rect: selectorInfo.rect, currentStatus: selectorInfo.currentStatus, currentObs: selectorInfo.currentObs });
    } else {
      saveStatus(selectorInfo.company.companyId, selectorInfo.month, status, null, selectorInfo.company.responsible?.id ?? null);
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

    for (const item of items) applyOptimistic(item.companyId, item.month, item.status, item.observation, item.responsibleId);

    try {
      const res = await fetch('/api/activities/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast({ type: 'success', message: `${json.data.succeeded} status atualizado${json.data.succeeded !== 1 ? 's' : ''}` });
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year);
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
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year);
      else await loadStatuses(obligation, year);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao limpar em lote' });
      if (obligation === 'cotas_irpj_csll') await doSearch(obligation, year);
      else await loadStatuses(obligation, year);
    }
    setSelected(new Set());
  }

  /* ─── Revert termination ─── */
  async function confirmRevert() {
    if (!revertTarget) return;
    setReverting(true);
    try {
      const res = await fetch(`/api/companies/${revertTarget.id}/revert-termination`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResults((prev) => prev.filter((r) => r.companyId !== revertTarget.id));
      setTerminatedCompanies((prev) => prev.filter((c) => c.id !== revertTarget.id));
      setSelected((prev) => { const n = new Set(prev); n.delete(revertTarget.id); return n; });
      addToast({ type: 'success', message: 'Rescisão revertida. A empresa voltou para a carteira.' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao reverter rescisão' });
    } finally {
      setReverting(false);
      setRevertTarget(null);
    }
  }

  /* ─── Excel export ─── */
  async function handleExcelSingle() {
    if (!year || !obligation) return;
    setExcelLoading(true);
    try {
      const params = new URLSearchParams({ obligation, year, onlyTerminated: 'true' });
      const filename = `rescindidas_${obligation}_${year}.xlsx`;
      await triggerDownload(`/api/export/activities?${params}`, filename);
      addToast({ type: 'success', message: 'Excel gerado com sucesso.' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao gerar Excel';
      if (msg.includes('0 empresa')) addToast({ type: 'warning', message: 'Nenhuma empresa elegível para exportar.' });
      else addToast({ type: 'error', message: msg });
    } finally { setExcelLoading(false); }
  }

  async function handleExcelComplete() {
    if (!year) return;
    setExcelCompleteLoading(true);
    try {
      const params = new URLSearchParams({ year, onlyTerminated: 'true' });
      const filename = `rescindidas_completo_${year}.xlsx`;
      await triggerDownload(`/api/export/activities/complete?${params}`, filename);
      addToast({ type: 'success', message: 'Excel completo gerado com sucesso.' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao gerar Excel completo' });
    } finally { setExcelCompleteLoading(false); }
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
          <h1 className="page-title">Rescindidas</h1>
          <p className="page-subtitle">Empresas encerradas</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: 90, height: 34, fontSize: 'var(--font-size-sm)' }}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {accountingYears.map((y) => <option key={y.id} value={String(y.year)}>{y.year}</option>)}
          </select>
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
            onClick={() => window.print()}
            style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
          >
            🖨 Imprimir
          </button>
        </div>
      </div>

      {/* Print-only header info */}
      <div className="print-only" style={{ display: 'none', marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: '#374151' }}>Obrigação: <strong>{activeTab?.label ?? obligation}</strong> &nbsp;|&nbsp; Ano: <strong>{year}</strong></p>
      </div>

      {/* ── Bulk action bar ── */}
      <Card style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCompaniesExpanded((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            aria-label={companiesExpanded ? 'Recolher lista' : 'Expandir lista'}
            title={companiesExpanded ? 'Recolher lista' : 'Expandir lista'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: companiesExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)' }}>Lista de empresas rescindidas</p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
              {filteredCompanies.length} de {terminatedCompanies.length} empresa{terminatedCompanies.length !== 1 ? 's' : ''}
            </p>
          </div>
          {companiesExpanded && (
            <>
              <input
                className="form-input"
                style={{ flex: '1 1 260px', maxWidth: 360, height: 32, fontSize: 'var(--font-size-sm)' }}
                placeholder="Buscar empresa, grupo, CPF, CNPJ..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
              />
              {companySearch && (
                <button className="action-btn" style={{ height: 32 }} onClick={() => setCompanySearch('')}>Limpar</button>
              )}
            </>
          )}
        </div>

        {companiesExpanded && (
          companiesLoading ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-placeholder)' }}>Carregando empresas...</div>
          ) : filteredCompanies.length === 0 ? (
            <div style={{ padding: 28 }}>
              <EmptyState
                title={companySearch ? 'Nenhuma empresa rescindida encontrada' : 'Nenhuma empresa rescindida cadastrada'}
                description={companySearch ? 'Ajuste a busca para encontrar empresas.' : 'Quando uma empresa for marcada como rescindida, ela aparecerá aqui.'}
              />
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 1760, fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Ações</th>
                    <th style={{ width: 65 }}>Cód.</th>
                    <th style={{ width: 95 }}>Grupo</th>
                    <th style={{ minWidth: 220 }}>Razão Social</th>
                    <th style={{ width: 145 }}>CNPJ / CPF</th>
                    <th style={{ width: 150 }}>Tributação</th>
                    <th style={{ width: 110 }}>Nível</th>
                    <th style={{ width: 120 }}>Operação</th>
                    <th style={{ width: 80 }}>Início</th>
                    <th style={{ width: 95 }}>Rescisão</th>
                    <th style={{ width: 130 }}>Financeiro</th>
                    <th style={{ width: 130 }}>DP</th>
                    <th style={{ width: 130 }}>Fiscal</th>
                    <th style={{ width: 130 }}>Análise</th>
                    <th style={{ width: 130 }}>Revisão</th>
                    <th style={{ width: 130 }}>IR Aluguel</th>
                    <th style={{ width: 130 }}>MIT</th>
                    <th style={{ width: 85 }}>Célula</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((c) => {
                    const activeTax = c.taxRegimes?.find((tr) => tr.accountingYearId === activeYear?.id);
                    const taxRegime = activeTax
                      ? taxRegimes.find((t) => t.id === activeTax.taxRegimeId) ?? activeTax.taxRegime ?? null
                      : null;

                    return (
                      <tr key={c.id}>
                        <td>
                          <button className="action-btn" onClick={() => setRevertTarget({ id: c.id, corporateName: c.corporateName })}>↩ Reverter</button>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{c.code ?? '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.groupName ?? '—'}</td>
                        <td style={{ whiteSpace: 'normal', minWidth: 220 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.corporateName}</span>
                            <CompanyTypeBadge type={c.companyType} />
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {c.document ? formatDocument(c.document) : <span style={PLACEHOLDER}>—</span>}
                        </td>
                        <td><TaxBadge regime={taxRegime as TaxRegime | null} /></td>
                        <td><LevelChip company={c} levels={levels} /></td>
                        <td><OperacaoCell c={c} /></td>
                        <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{c.startCompetence ?? <span style={PLACEHOLDER}>—</span>}</td>
                        <td><span className="badge badge-danger" style={{ fontSize: 'var(--font-size-xs)' }}>{c.terminationMonth ?? '—'}</span></td>
                        <td><RespCell prof={c.financialResponsible} /></td>
                        <td><RespCell prof={c.dpResponsible} /></td>
                        <td><RespCell prof={c.fiscalResponsible} /></td>
                        <td><RespCell prof={c.analysisResponsible} /></td>
                        <td><RespCell prof={c.reviewResponsible} /></td>
                        <td><RespCell prof={c.irRentResponsible} /></td>
                        <td><RespCell prof={c.mitResponsible} /></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.cellTeam?.name ?? c.cell ?? <span style={PLACEHOLDER}>—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      {selected.size > 0 && !isAnnual && (
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
          <ObligationTabs active={obligation} onChange={(code) => { setObligation(code); setSelected(new Set()); setBulkMonths([currentMonth]); setSearch(''); setFilterResp(''); }} />
        </div>
        {updating && (
          <div style={{ height: 2, background: 'var(--color-primary)', opacity: 0.45 }} />
        )}

        {loading ? (
          <div style={{ padding: 20 }}><LoadingState message="Buscando empresas rescindidas…" /></div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-danger)' }}>
            <p style={{ fontWeight: 600 }}>Erro ao processar dados</p>
            <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 4 }}>{error}</p>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                style={{ flex: '2 1 200px', height: 32, fontSize: 'var(--font-size-sm)' }}
                placeholder="Buscar empresa ou cód..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="form-select"
                style={{ flex: '1 1 150px', height: 32, fontSize: 'var(--font-size-sm)' }}
                value={filterResp}
                onChange={(e) => setFilterResp(e.target.value)}
              >
                <option value="">Responsável</option>
                {availableResps.map((r) => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
              </select>
              {hasFilters && (
                <button className="action-btn" style={{ height: 32 }} onClick={() => { setSearch(''); setFilterResp(''); }}>Limpar</button>
              )}
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} rescindida{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Status legend */}
            <div className="no-print" style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-color)' }}>
              <StatusLegend availableStatuses={availableStatuses} />
            </div>

            {/* Sub-header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>{activeTab?.label ?? obligation}</span>
              {isAnnual && <span className="badge badge-stc" style={{ fontSize: 'var(--font-size-xs)' }}>Anual</span>}
              {isSpedObligation && year && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Tributação considerada: {Number(year) - 1}</span>}
              <span className="badge badge-danger" style={{ fontSize: 'var(--font-size-xs)' }}>Rescindidas</span>
            </div>

            {/* Grid area */}
            {results.length === 0 && !loading ? (
              <div style={{ padding: '32px 14px' }}>
                <EmptyState
                  title="Nenhuma empresa rescindida cadastrada"
                  description="Não há empresas com o status de rescindida. Acesse o cadastro de Empresas para marcar uma empresa como rescindida."
                />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '32px 14px' }}>
                <EmptyState
                  title={hasFilters ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa rescindida elegível'}
                  description={
                    hasFilters
                      ? 'Ajuste os filtros para encontrar empresas.'
                      : 'Nenhuma empresa rescindida se enquadra nesta obrigação para o ano selecionado.'
                  }
                />
              </div>
            ) : isAnnual ? (
              <SPEDGrid
                results={filtered}
                statusMap={spedMap}
                year={year}
                onCellClick={handleSpedCellClick}
                onRevertTermination={(company) => setRevertTarget({ id: company.companyId, corporateName: company.corporateName })}
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
                onRevertTermination={(company) => setRevertTarget({ id: company.companyId, corporateName: company.corporateName })}
              />
            )}

            {/* Legend footer */}
            {!isAnnual && filtered.length > 0 && (
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

      {/* ── Confirm revert termination ── */}
      <ConfirmDialog
        open={revertTarget !== null}
        onClose={() => setRevertTarget(null)}
        onConfirm={confirmRevert}
        title="Reverter rescisão"
        message={`Deseja reverter a rescisão de "${revertTarget?.corporateName}"? Ela voltará a aparecer como empresa ativa da carteira.`}
        confirmLabel="Reverter rescisão"
        cancelLabel="Cancelar"
        variant="primary"
        loading={reverting}
      />
    </div>
  );
}
