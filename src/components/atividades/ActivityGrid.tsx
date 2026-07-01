'use client';

import React, { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import type { EligibleCompanyResult, MonthInfo } from '@/types/rules';
import type { ActivityStatus } from '@/types/entities';
import { STATUS_CFG } from './StatusSelector';

/* ─── Quick history tooltip ─── */
interface HistoryEntry { month: number; previousStatus: string | null; newStatus: string | null; observation: string | null; createdAt: string }

function HistoryTooltip({ entries, rect }: { entries: HistoryEntry[]; rect: DOMRect }) {
  const style: React.CSSProperties = {
    position: 'fixed',
    top: rect.bottom + 6,
    left: Math.min(rect.left, window.innerWidth - 260),
    zIndex: 9999,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
    padding: '8px 10px',
    minWidth: 220,
    maxWidth: 280,
    pointerEvents: 'none',
  };
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return (
    <div style={style}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-placeholder)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        Histórico
      </p>
      {entries.length === 0 ? (
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Sem histórico</p>
      ) : entries.map((e, i) => {
        const prev = e.previousStatus ? (STATUS_CFG[e.previousStatus]?.label ?? e.previousStatus) : '—';
        const next = e.newStatus      ? (STATUS_CFG[e.newStatus]?.label      ?? e.newStatus)      : '—';
        const monthLabel = e.month >= 1 && e.month <= 12 ? MONTHS[e.month - 1] : e.month === 0 ? 'Anual' : String(e.month);
        const date = new Date(e.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return (
          <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : undefined, paddingTop: i > 0 ? 5 : 0, marginTop: i > 0 ? 5 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{monthLabel}</span>
              <span style={{ color: 'var(--text-placeholder)' }}>{prev}</span>
              <span style={{ color: 'var(--text-placeholder)' }}>→</span>
              <span style={{ fontWeight: 700, color: e.newStatus ? (STATUS_CFG[e.newStatus]?.color ?? 'var(--text-primary)') : 'var(--text-placeholder)' }}>{next}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-placeholder)' }}>{date}</span>
            </div>
            {e.observation && (
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.observation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Constants ─── */
export const MONTH_ABBR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'] as const;
export const MONTHS_1_12 = [1,2,3,4,5,6,7,8,9,10,11,12] as const;

export type StatusMap = Map<number, Map<number, ActivityStatus>>;
export function buildStatusMap(list: ActivityStatus[]): StatusMap {
  const m = new Map<number, Map<number, ActivityStatus>>();
  for (const s of list) {
    if (!m.has(s.companyId)) m.set(s.companyId, new Map());
    m.get(s.companyId)!.set(s.month, s);
  }
  return m;
}

/* ─── Small status badge for cells ─── */
function CellBadge({ code }: { code: string }) {
  const c = STATUS_CFG[code];
  if (!c) return null;
  return (
    <span style={{
      display: 'inline-block', background: c.bg, color: c.color,
      fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
      whiteSpace: 'nowrap', lineHeight: 1.5,
    }}>
      {c.label}
    </span>
  );
}

/* ─── Month cell ─── */
interface MonthCellProps {
  monthInfo: MonthInfo | undefined;
  status: ActivityStatus | undefined;
  isCurrent: boolean;
  onClick: (e: React.MouseEvent<HTMLTableCellElement>) => void;
  onMouseEnter?: (rect: DOMRect) => void;
  onMouseLeave?: () => void;
}

function MonthCell({ monthInfo, status, isCurrent, onClick, onMouseEnter, onMouseLeave }: MonthCellProps) {
  const isBlocked = !monthInfo || monthInfo.blocked;
  const cfg = status ? STATUS_CFG[status.status] : null;

  const base: React.CSSProperties = {
    width: 56, padding: '4px 3px', textAlign: 'center', verticalAlign: 'middle',
    borderBottom: '1px solid var(--border-color)',
    ...(isCurrent && !isBlocked ? { background: 'var(--current-month-bg)' } : {}),
    ...(!isBlocked ? { cursor: 'pointer' } : {}),
  };

  if (monthInfo?.blockReason === 'inicio_competencia') {
    return (
      <td style={base} title="Bloqueado por início de competência">
        <div style={{ width: 28, height: 20, margin: '0 auto', borderRadius: 4, background: 'rgba(100,116,139,0.22)' }} />
      </td>
    );
  }

  if (monthInfo?.blockReason === 'rescisao') {
    return (
      <td style={base} title={monthInfo ? `Bloqueado por rescisão` : 'Bloqueado por rescisão'}>
        <div style={{ width: 28, height: 20, margin: '0 auto', borderRadius: 4, background: 'repeating-linear-gradient(45deg,rgba(100,116,139,0.45) 0,rgba(100,116,139,0.45) 2px,transparent 2px,transparent 5px)' }} />
      </td>
    );
  }

  return (
    <td
      style={base}
      onClick={onClick}
      onMouseEnter={onMouseEnter ? (e) => onMouseEnter((e.currentTarget as HTMLTableCellElement).getBoundingClientRect()) : undefined}
      onMouseLeave={onMouseLeave}
    >
      {status ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CellBadge code={status.status} />
          {status.observation && (
            <span
              style={{ fontSize: 9, color: cfg?.color ?? 'var(--text-secondary)', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}
              title={status.observation}
            >
              {status.observation}
            </span>
          )}
        </div>
      ) : (
        !isBlocked && (
          <div
            style={{
              width: 28,
              height: 20,
              margin: '0 auto',
              borderRadius: 3,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
            }}
          />
        )
      )}
    </td>
  );
}

/* ─── Company row ─── */
function CompanyRow({
  company, currentMonth, selected, onToggle, statusMap, onCellClick, onRevertTermination,
}: {
  company: EligibleCompanyResult;
  currentMonth: number;
  selected: boolean;
  onToggle: () => void;
  statusMap: StatusMap;
  onCellClick: (company: EligibleCompanyResult, month: number, rect: DOMRect) => void;
  onRevertTermination?: (company: EligibleCompanyResult) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const bg = hovered ? 'var(--bg-table-row-hover)' : 'var(--bg-card)';

  // Quick history tooltip
  const [tooltip, setTooltip] = useState<{ entries: HistoryEntry[]; rect: DOMRect } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringRef = useRef(false);

  function handleCellMouseEnter(month: number, status: ActivityStatus | undefined, rect: DOMRect) {
    if (!status) return;
    isHoveringRef.current = true;
    tooltipTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/activities/history?companyId=${company.companyId}&year=${status.year}&month=${month}&limit=3`);
        const json = await res.json();
        const items: HistoryEntry[] = json.data?.items ?? json.data ?? [];
        // O mouse pode ter saído da célula enquanto a requisição estava em andamento —
        // só exibe o tooltip se ainda estiver sobre a célula, senão ele fica preso na tela.
        if (isHoveringRef.current) setTooltip({ entries: items, rect });
      } catch { /* ignore */ }
    }, 450);
  }

  function handleCellMouseLeave() {
    isHoveringRef.current = false;
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(null);
  }

  const tdBase: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle', fontSize: 12, color: 'var(--text-primary)' };
  const stickyTd = (left: number, extra?: React.CSSProperties): React.CSSProperties => ({ ...tdBase, position: 'sticky', left, zIndex: 2, background: bg, ...extra });

  function hexBadge(hex: string | null | undefined) {
    if (!hex) return {};
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return {};
    const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    return { background: `rgba(${r},${g},${b},0.12)`, color: hex, border: `1px solid rgba(${r},${g},${b},0.3)` };
  }

  return (
    <>
    <tr onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ background: bg }}>
      <td style={{ ...stickyTd(0), padding: '6px 0', textAlign: 'center' }}>
        <input type="checkbox" checked={selected} onChange={onToggle} style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
      </td>
      <td style={{ ...stickyTd(36), fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{company.code ?? '—'}</td>
      <td style={{ ...stickyTd(90), color: 'var(--text-secondary)' }}>{company.groupName ?? '—'}</td>
      <td style={{ ...stickyTd(200), whiteSpace: 'normal' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500, lineHeight: 1.35, wordBreak: 'break-word', flex: '1 1 100px', minWidth: 0 }}>
            {company.corporateName}
          </span>
          {company.companyType === 'MATRIZ' && (
            <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, padding: '2px 5px', borderRadius: 3, background: 'rgba(37,99,235,0.1)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.25)', whiteSpace: 'nowrap' }}>
              MATRIZ
            </span>
          )}
          {company.companyType === 'FILIAL' && (
            <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, padding: '2px 5px', borderRadius: 3, background: 'rgba(234,88,12,0.1)', color: '#EA580C', border: '1px solid rgba(234,88,12,0.25)', whiteSpace: 'nowrap' }}>
              FILIAL
            </span>
          )}
          {company.terminated && (
            <span style={{ fontSize: 9, fontWeight: 700, flexShrink: 0, padding: '1px 4px', borderRadius: 3, background: 'rgba(220,38,38,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.25)', whiteSpace: 'nowrap' }}>
              {company.terminationMonth ? `RES ${company.terminationMonth}` : 'RES'}
            </span>
          )}
        </div>
      </td>
      <td style={tdBase}>
        {company.taxRegime ? (
          <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', ...hexBadge(company.taxRegime.color) }}>
            {company.taxRegime.name}
          </span>
        ) : <span style={{ color: 'var(--text-placeholder)' }}>—</span>}
      </td>
      <td style={{ ...tdBase, color: 'var(--text-secondary)', fontWeight: 700 }}>
        {company.responsible ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {company.level?.color && <span style={{ width: 6, height: 6, borderRadius: '50%', background: company.level.color, flexShrink: 0 }} />}
            {company.responsible.name}
          </span>
        ) : <span style={{ color: 'var(--text-placeholder)' }}>—</span>}
      </td>
      {onRevertTermination && (
        <td style={{ ...tdBase, width: 80, textAlign: 'center', padding: '4px 6px' }}>
          <button
            onClick={() => onRevertTermination(company)}
            title="Reverter rescisão"
            style={{ background: 'none', border: '1px solid var(--color-warning)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--color-warning)', fontFamily: 'var(--font-family)', lineHeight: 1.5, whiteSpace: 'nowrap', transition: 'background 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-warning-soft)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            ↩ Reverter
          </button>
        </td>
      )}
      {MONTHS_1_12.map((m, i) => {
        const st = statusMap.get(company.companyId)?.get(m);
        return (
          <MonthCell
            key={m}
            monthInfo={company.months[i]}
            status={st}
            isCurrent={m === currentMonth}
            onClick={(e) => {
              if (!company.months[i] || company.months[i].blocked) return;
              onCellClick(company, m, (e.currentTarget as HTMLTableCellElement).getBoundingClientRect());
            }}
            onMouseEnter={(rect) => handleCellMouseEnter(m, st, rect)}
            onMouseLeave={handleCellMouseLeave}
          />
        );
      })}
    </tr>
    {tooltip && typeof document !== 'undefined' && ReactDOM.createPortal(
      <HistoryTooltip entries={tooltip.entries} rect={tooltip.rect} />,
      document.body
    )}
  </>
  );
}

/* ─── ActivityGrid ─── */
export interface CellClickInfo {
  company: EligibleCompanyResult;
  month: number;
  rect: DOMRect;
  currentStatus: string | null;
  currentObs: string | null;
}

interface ActivityGridProps {
  results: EligibleCompanyResult[];
  statusMap: StatusMap;
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onCellClick: (info: CellClickInfo) => void;
  currentMonth: number;
  onRevertTermination?: (company: EligibleCompanyResult) => void;
}

export function ActivityGrid({
  results, statusMap, selected, onToggle, onToggleAll, onCellClick, currentMonth, onRevertTermination,
}: ActivityGridProps) {
  const allIds = results.map((r) => r.companyId);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const showActions = !!onRevertTermination;

  // Progress per month
  const monthProgress = useMemo(() => MONTHS_1_12.map((m) => {
    const eligible = results.filter((r) => r.months[m - 1]?.eligible).length;
    if (eligible === 0) return 0;
    const done = results.filter((r) => {
      const s = statusMap.get(r.companyId)?.get(m);
      return s?.status === 'OK' || s?.status === 'S/M';
    }).length;
    return Math.round((done / eligible) * 100);
  }), [results, statusMap]);

  const thBase: React.CSSProperties = { padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderBottom: '2px solid var(--border-color)', background: 'var(--bg-table-header)', position: 'sticky', top: 0, zIndex: 3 };
  const stickyTh = (left: number, extra?: React.CSSProperties): React.CSSProperties => ({ ...thBase, position: 'sticky', left, top: 0, zIndex: 5, ...extra });

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 980 }}>
        <colgroup>
          <col style={{ width: 36 }} /><col style={{ width: 54 }} /><col style={{ width: 110 }} /><col style={{ width: 260 }} />
          <col style={{ width: 130 }} /><col style={{ width: 110 }} />
          {showActions && <col style={{ width: 80 }} />}
          {MONTHS_1_12.map((m) => <col key={m} style={{ width: 56 }} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...stickyTh(0), padding: '8px 0', textAlign: 'center' }}>
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
            </th>
            <th style={stickyTh(36)}>COD</th>
            <th style={stickyTh(90)}>Grupo</th>
            <th style={stickyTh(200)}>Empresa</th>
            <th style={thBase}>Tributação</th>
            <th style={thBase}>Responsável</th>
            {showActions && <th style={{ ...thBase, width: 80, textAlign: 'center' }}>Ações</th>}
            {MONTHS_1_12.map((m, i) => {
              const isCurrent = m === currentMonth;
              const progress = monthProgress[i];
              const barColor = progress >= 100 ? 'var(--color-success)' : progress >= 50 ? 'var(--color-warning)' : 'var(--text-placeholder)';
              return (
                <th
                  key={m}
                  style={{
                    ...thBase,
                    padding: '7px 4px 5px',
                    textAlign: 'center',
                    // Camada sólida por baixo do tingimento translúcido — o header é sticky, então um
                    // background com alpha deixaria as linhas rolando por baixo aparecerem através dele.
                    background: isCurrent
                      ? 'linear-gradient(var(--current-month-bg), var(--current-month-bg)), var(--bg-table-header)'
                      : 'var(--bg-table-header)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: isCurrent ? 'var(--color-primary)' : undefined }}>{MONTH_ABBR[i]}</span>
                    <div style={{ width: 38, height: 3, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <CompanyRow
              key={r.companyId}
              company={r}
              currentMonth={currentMonth}
              selected={selected.has(r.companyId)}
              onToggle={() => onToggle(r.companyId)}
              statusMap={statusMap}
              onRevertTermination={onRevertTermination}
              onCellClick={(company, month, rect) => {
                const st = statusMap.get(company.companyId)?.get(month);
                onCellClick({ company, month, rect, currentStatus: st?.status ?? null, currentObs: st?.observation ?? null });
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
