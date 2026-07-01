'use client';

import React, { useState } from 'react';
import type { EligibleCompanyResult } from '@/types/rules';
import type { ActivityStatus } from '@/types/entities';
import { STATUS_CFG } from './StatusSelector';

function hexBadge(hex: string | null | undefined) {
  if (!hex) return {};
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return {};
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  return { background: `rgba(${r},${g},${b},0.12)`, color: hex, border: `1px solid rgba(${r},${g},${b},0.3)` };
}

function StatusCell({ status, onCellClick }: { status: ActivityStatus | undefined; onCellClick: (rect: DOMRect) => void }) {
  const [hov, setHov] = useState(false);
  const cfg = status ? STATUS_CFG[status.status] : null;

  return (
    <td
      style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', verticalAlign: 'middle', cursor: 'pointer', background: hov ? 'var(--bg-hover)' : undefined, transition: 'background 0.1s' }}
      onClick={(e) => onCellClick((e.currentTarget as HTMLTableCellElement).getBoundingClientRect())}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {status ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ display: 'inline-block', background: cfg!.bg, color: cfg!.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
            {cfg!.label}
          </span>
          {status.observation && (
            <span style={{ fontSize: 10, color: cfg!.color, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={status.observation}>
              {status.observation}
            </span>
          )}
        </div>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>—</span>
      )}
    </td>
  );
}

interface SPEDGridProps {
  results: EligibleCompanyResult[];
  statusMap: Map<number, ActivityStatus>;  // companyId → status (month=0)
  year: string;
  onCellClick: (company: EligibleCompanyResult, rect: DOMRect, currentStatus: string | null, currentObs: string | null) => void;
  onRevertTermination?: (company: EligibleCompanyResult) => void;
}

export function SPEDGrid({ results, statusMap, year, onCellClick, onRevertTermination }: SPEDGridProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const showActions = !!onRevertTermination;

  const thBase: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderBottom: '2px solid var(--border-color)', background: 'var(--bg-table-header)' };
  const tdBase: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle', fontSize: 12, color: 'var(--text-primary)' };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr>
            <th style={{ ...thBase, width: 65 }}>COD</th>
            <th style={{ ...thBase, width: 100 }}>Grupo</th>
            <th style={{ ...thBase, minWidth: 200 }}>Empresa</th>
            <th style={{ ...thBase, width: 160 }}>Tributação {Number(year) - 1}</th>
            <th style={{ ...thBase, width: 130 }}>Responsável (Análise)</th>
            <th style={{ ...thBase, width: 110, textAlign: 'center' }}>Status {year}</th>
            <th style={{ ...thBase, minWidth: 160 }}>Observação</th>
            {showActions && <th style={{ ...thBase, width: 100, textAlign: 'center' }}>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const bg = hoveredRow === r.companyId ? 'var(--bg-table-row-hover)' : 'var(--bg-card)';
            const st = statusMap.get(r.companyId);
            return (
              <tr key={r.companyId} style={{ background: bg, cursor: 'default' }}
                onMouseEnter={() => setHoveredRow(r.companyId)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td style={{ ...tdBase, fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>{r.code ?? '—'}</td>
                <td style={{ ...tdBase, color: 'var(--text-secondary)' }}>{r.groupName ?? '—'}</td>
                <td style={tdBase}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontWeight: 500, flex: 1, minWidth: 0 }} title={r.corporateName}>
                      {r.corporateName}
                    </span>
                    {r.terminated && r.terminationMonth && (
                      <span style={{ fontSize: 9, fontWeight: 700, flexShrink: 0, padding: '1px 4px', borderRadius: 3, background: 'rgba(220,38,38,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.25)', whiteSpace: 'nowrap' }}>
                        RES {r.terminationMonth}
                      </span>
                    )}
                  </div>
                </td>
                <td style={tdBase}>
                  {r.taxRegime ? (
                    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', ...hexBadge(r.taxRegime.color) }}>
                      {r.taxRegime.name}
                    </span>
                  ) : <span style={{ color: 'var(--text-placeholder)' }}>—</span>}
                </td>
                <td style={{ ...tdBase, color: 'var(--text-secondary)', fontWeight: 700 }}>
                  {r.responsible?.name ?? <span style={{ color: 'var(--text-placeholder)' }}>—</span>}
                </td>
                <StatusCell
                  status={st}
                  onCellClick={(rect) => onCellClick(r, rect, st?.status ?? null, st?.observation ?? null)}
                />
                <td style={{ ...tdBase, fontSize: 11, color: 'var(--text-secondary)' }}>
                  {st?.observation
                    ? <span title={st.observation} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 200 }}>{st.observation}</span>
                    : <span style={{ color: 'var(--text-placeholder)' }}>—</span>}
                </td>
                {showActions && (
                  <td style={{ ...tdBase, textAlign: 'center', padding: '4px 6px' }}>
                    <button
                      onClick={() => onRevertTermination!(r)}
                      title="Reverter rescisão"
                      style={{ background: 'none', border: '1px solid var(--color-warning)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--color-warning)', fontFamily: 'var(--font-family)', lineHeight: 1.5, whiteSpace: 'nowrap', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-warning-soft)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                    >
                      ↩ Reverter
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
