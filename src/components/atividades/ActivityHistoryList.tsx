'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { STATUS_CFG } from './StatusSelector';

/* ─── Types ─── */
interface HistoryItem {
  id: number;
  companyId: number;
  obligationId: number;
  year: number;
  month: number;
  previousStatus: string | null;
  newStatus: string | null;
  observation: string | null;
  responsibleId: number | null;
  createdAt: string;
  obligation: { id: number; code: string; name: string };
  responsible: { id: number; name: string } | null;
}

interface Filters {
  obligationId: string;
  year: string;
  newStatus: string;
}

const MONTH_ABBR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function formatPeriod(month: number, year: number): string {
  if (month === 0) return String(year);
  return `${MONTH_ABBR[month - 1]}/${year}`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* ─── Mini status badge ─── */
function HistoryBadge({ code }: { code: string | null }) {
  if (!code) return <span style={{ fontSize: 11, color: 'var(--text-placeholder)', fontStyle: 'italic' }}>Sem status</span>;
  const c = STATUS_CFG[code];
  if (!c) return <span style={{ fontSize: 11 }}>{code}</span>;
  return (
    <span style={{ display: 'inline-block', background: c.bg, color: c.color, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

/* ─── Single history item ─── */
function HistoryCard({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const period = formatPeriod(item.month, item.year);

  return (
    <div style={{
      padding: '12px 14px',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-card)',
    }}>
      {/* Obligation + period */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {item.obligation.name}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 6 }}>· {period}</span>
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-placeholder)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatDateTime(item.createdAt)}
        </span>
      </div>

      {/* Status transition */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <HistoryBadge code={item.previousStatus} />
        <span style={{ color: 'var(--text-placeholder)', fontSize: 14, lineHeight: 1 }}>→</span>
        {item.newStatus === null
          ? <span style={{ fontSize: 11, color: 'var(--color-danger)', fontStyle: 'italic' }}>Status limpo</span>
          : <HistoryBadge code={item.newStatus} />
        }
      </div>

      {/* Responsible */}
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: item.observation ? 4 : 0 }}>
        <span style={{ color: 'var(--text-placeholder)' }}>Responsável: </span>
        {item.responsible?.name ?? <span style={{ fontStyle: 'italic' }}>não informado</span>}
      </p>

      {/* Observation */}
      {item.observation && (
        <div>
          <p
            onClick={() => setExpanded((v) => !v)}
            style={{ fontSize: 11, color: 'var(--text-secondary)', cursor: item.observation.length > 80 ? 'pointer' : 'default' }}
          >
            <span style={{ color: 'var(--text-placeholder)' }}>Obs: </span>
            {expanded || item.observation.length <= 80
              ? item.observation
              : `${item.observation.slice(0, 80)}… `}
            {item.observation.length > 80 && (
              <span style={{ color: 'var(--color-primary)', fontSize: 10 }}>{expanded ? ' ver menos' : ' ver mais'}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── ActivityHistoryList ─── */
export interface ActivityHistoryListProps {
  companyId: number;
  limit?: number;
  showFilters?: boolean;
}

export function ActivityHistoryList({ companyId, limit = 50, showFilters = true }: ActivityHistoryListProps) {
  const { obligations, accountingYears } = useAppContext();

  const [items, setItems]       = useState<HistoryItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({ obligationId: '', year: '', newStatus: '' });

  const load = useCallback(async (f: Filters) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ companyId: String(companyId), limit: String(limit) });
      if (f.obligationId) params.set('obligationId', f.obligationId);
      if (f.year)         params.set('year',         f.year);
      if (f.newStatus)    params.set('newStatus',    f.newStatus);
      const res  = await fetch(`/api/activities/history?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setItems(json.data.items);
      setTotal(json.data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar histórico');
    } finally { setLoading(false); }
  }, [companyId, limit]);

  useEffect(() => { load(filters); }, [load]);

  function applyFilter(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(next);
  }

  function clearFilters() {
    const reset = { obligationId: '', year: '', newStatus: '' };
    setFilters(reset);
    load(reset);
  }

  const hasFilters = !!(filters.obligationId || filters.year || filters.newStatus);

  const allStatuses = ['OK','S/M','P','ST-I','ST-C'];
  const years = accountingYears.map((y) => y.year).sort((a, b) => b - a);

  return (
    <div>
      {/* Filters */}
      {showFilters && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <select className="form-select" style={{ flex: '1 1 140px', height: 32, fontSize: 'var(--font-size-sm)' }}
            value={filters.obligationId} onChange={(e) => applyFilter('obligationId', e.target.value)}>
            <option value="">Obrigação</option>
            {obligations.map((o) => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
          </select>

          <select className="form-select" style={{ flex: '1 1 90px', height: 32, fontSize: 'var(--font-size-sm)' }}
            value={filters.year} onChange={(e) => applyFilter('year', e.target.value)}>
            <option value="">Ano</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>

          <select className="form-select" style={{ flex: '1 1 100px', height: 32, fontSize: 'var(--font-size-sm)' }}
            value={filters.newStatus} onChange={(e) => applyFilter('newStatus', e.target.value)}>
            <option value="">Status</option>
            {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="__clear__">Limpos</option>
          </select>

          {hasFilters && (
            <button className="action-btn" style={{ height: 32 }} onClick={clearFilters}>Limpar</button>
          )}

          {total > 0 && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
              {total} registro{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingState message="Carregando histórico..." />
      ) : error ? (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{error}</div>
      ) : items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Nenhum histórico encontrado' : 'Sem histórico de alterações'}
          description={
            hasFilters
              ? 'Nenhum histórico encontrado para os filtros aplicados.'
              : 'As alterações de status desta empresa aparecerão aqui.'
          }
        />
      ) : (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {items.map((item) => <HistoryCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
