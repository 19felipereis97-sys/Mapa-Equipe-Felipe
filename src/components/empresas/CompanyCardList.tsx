'use client';

import React from 'react';
import type { Company, Level, TaxRegime } from '@/types/entities';

interface CompanyCardListProps {
  companies: Company[];
  levels: Level[];
  taxRegimes: TaxRegime[];
  activeYearId: number | undefined;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onOpenEdit: (c: Company) => void;
}

// Visão em cards da tabela de Empresas (~19 colunas) para telas de celular —
// mostra um resumo por empresa em vez de forçar rolagem horizontal extrema.
// Reaproveita 100% do estado/lógica já existente na página (filtros, seleção
// em lote, CompanyDrawer para edição).
export function CompanyCardList({
  companies, levels, taxRegimes, activeYearId, selectedIds, onToggleSelect, onOpenEdit,
}: CompanyCardListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
      {companies.map((c) => {
        const activeTax = c.taxRegimes?.find((tr) => tr.accountingYearId === activeYearId);
        const taxRegime = activeTax
          ? taxRegimes.find((t) => t.id === activeTax.taxRegimeId) ?? activeTax.taxRegime ?? null
          : null;
        const level = levels.find((l) => l.id === c.levelId);

        const responsibleEntries: [string, { name: string } | null | undefined][] = [
          ['Financeiro', c.financialResponsible],
          ['DP', c.dpResponsible],
          ['Fiscal', c.fiscalResponsible],
          ['Análise', c.analysisResponsible],
          ['Revisão', c.reviewResponsible],
          ['IR Aluguel', c.irRentResponsible],
          ['MIT', c.mitResponsible],
        ];
        const mainResp = responsibleEntries.find(([, v]) => v);

        return (
          <div
            key={c.id}
            onClick={() => onOpenEdit(c)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(c.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect(c.id)}
              style={{ marginTop: 3, flexShrink: 0, accentColor: 'var(--color-primary)' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  {c.corporateName}
                </span>
                {c.companyType && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap',
                    background: c.companyType.toUpperCase() === 'MATRIZ' ? 'var(--color-primary-soft)' : '#FEF3C7',
                    color: c.companyType.toUpperCase() === 'MATRIZ' ? 'var(--color-primary)' : '#D97706',
                  }}>
                    {c.companyType.toUpperCase()}
                  </span>
                )}
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {[c.code && `COD ${c.code}`, c.groupName].filter(Boolean).join(' · ') || '—'}
              </p>

              {(taxRegime || level) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {taxRegime && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                      {taxRegime.name}
                    </span>
                  )}
                  {level && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                      {level.name}
                    </span>
                  )}
                </div>
              )}

              {mainResp && (
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {mainResp[0]}: {mainResp[1]?.name}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
