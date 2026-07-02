'use client';

import React, { useMemo } from 'react';
import type { EligibleCompanyResult } from '@/types/rules';
import type { ActivityStatus } from '@/types/entities';
import type { StatusMap } from './ActivityGrid';
import { STATUS_CFG } from './StatusSelector';
import type { CellClickInfo } from './ActivityGrid';

/* ─── Column definitions ─── */
interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  statuses: (string | null)[];
}

const COLUMNS: KanbanColumn[] = [
  { id: 'todo',    label: 'A Fazer',  color: 'var(--text-secondary)',  bgColor: 'var(--bg-hover)',         statuses: [null] },
  { id: 'pending', label: 'Pendente', color: 'var(--status-p-text)',   bgColor: 'var(--status-p-bg)',      statuses: ['P'] },
  { id: 'standby', label: 'Standby',  color: 'var(--status-sti-text)', bgColor: 'var(--status-sti-bg)',    statuses: ['ST-I','ST-C'] },
  { id: 'done',    label: 'Concluído',color: 'var(--status-ok-text)',  bgColor: 'var(--status-ok-bg)',     statuses: ['OK','S/M','PREJUIZO','COTA_UNICA'] },
];

/* ─── Company card ─── */
interface CardProps {
  company: EligibleCompanyResult;
  status: ActivityStatus | undefined;
  onClick: (rect: DOMRect) => void;
}

function CompanyCard({ company, status, onClick }: CardProps) {
  const cfg = status ? STATUS_CFG[status.status] : null;

  return (
    <div
      onClick={(e) => onClick((e.currentTarget as HTMLDivElement).getBoundingClientRect())}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'box-shadow var(--transition-fast), border-color var(--transition-fast)',
        marginBottom: 8,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = 'var(--shadow-md)';
        el.style.borderColor = 'var(--border-input)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = 'none';
        el.style.borderColor = 'var(--border-color)';
      }}
    >
      {/* Company name */}
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }} title={company.corporateName}>
        {company.corporateName}
      </p>

      {/* Code + Group */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        {company.code && (
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 3 }}>
            {company.code}
          </span>
        )}
        {company.groupName && (
          <span style={{ fontSize: 10, color: 'var(--text-placeholder)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }} title={company.groupName}>
            {company.groupName}
          </span>
        )}
      </div>

      {/* Responsible + Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {company.responsible?.name ?? '—'}
        </span>
        {cfg && (
          <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
            {cfg.label}
          </span>
        )}
      </div>

      {/* Observation */}
      {status?.observation && (
        <p style={{ fontSize: 10, color: 'var(--text-placeholder)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={status.observation}>
          {status.observation}
        </p>
      )}
    </div>
  );
}

/* ─── Column ─── */
function KanbanCol({
  col, cards, statusMap, month, onCellClick,
}: {
  col: KanbanColumn;
  cards: EligibleCompanyResult[];
  statusMap: StatusMap;
  month: number;
  onCellClick: (info: CellClickInfo) => void;
}) {
  return (
    <div className="kanban-column">
      {/* Column header */}
      <div
        className="kanban-column-header"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px',
          background: col.bgColor,
          borderRadius: 'var(--radius-sm)',
          marginBottom: 10,
          border: `1px solid ${col.bgColor}`,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {col.label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: col.color, background: 'rgba(255,255,255,0.5)', padding: '1px 7px', borderRadius: 99 }}>
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="kanban-column-cards">
        {cards.length === 0 ? (
          <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 11, color: 'var(--text-placeholder)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            Nenhuma empresa
          </div>
        ) : (
          cards.map((company) => {
            const st = statusMap.get(company.companyId)?.get(month);
            return (
              <CompanyCard
                key={company.companyId}
                company={company}
                status={st}
                onClick={(rect) => onCellClick({
                  company,
                  month,
                  rect,
                  currentStatus: st?.status ?? null,
                  currentObs: st?.observation ?? null,
                })}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── KanbanView ─── */
interface KanbanViewProps {
  results: EligibleCompanyResult[];
  statusMap: StatusMap;
  month: number;
  onCellClick: (info: CellClickInfo) => void;
  search: string;
}

export function KanbanView({ results, statusMap, month, onCellClick, search }: KanbanViewProps) {
  // Filter eligible companies for this month (not blocked)
  const eligibleForMonth = useMemo(() =>
    results.filter((r) => r.months[month - 1]?.eligible),
    [results, month]
  );

  // Apply search
  const filtered = useMemo(() => {
    if (!search) return eligibleForMonth;
    const q = search.toLowerCase();
    return eligibleForMonth.filter((r) =>
      [r.corporateName, r.groupName, r.code].some((f) => f?.toLowerCase().includes(q))
    );
  }, [eligibleForMonth, search]);

  // Distribute cards per column
  const columnCards = useMemo(() => {
    const map = new Map<string, EligibleCompanyResult[]>();
    for (const col of COLUMNS) map.set(col.id, []);

    for (const company of filtered) {
      const st = statusMap.get(company.companyId)?.get(month);
      const status = st?.status ?? null;

      const col = COLUMNS.find((c) => c.statuses.includes(status)) ?? COLUMNS[0];
      map.get(col.id)!.push(company);
    }
    return map;
  }, [filtered, statusMap, month]);

  if (results.length === 0) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
        Nenhuma empresa elegível para esta obrigação.
      </div>
    );
  }

  if (eligibleForMonth.length === 0) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
        Nenhuma empresa com mês elegível. Verifique as datas de início de competência.
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 14px 20px', overflowX: 'auto' }}>
      <div className="kanban-columns">
        {COLUMNS.map((col) => (
          <KanbanCol
            key={col.id}
            col={col}
            cards={columnCards.get(col.id) ?? []}
            statusMap={statusMap}
            month={month}
            onCellClick={onCellClick}
          />
        ))}
      </div>
    </div>
  );
}
