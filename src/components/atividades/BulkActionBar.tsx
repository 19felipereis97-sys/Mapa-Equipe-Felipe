'use client';

import React, { useState } from 'react';
import { STATUS_CFG } from './StatusSelector';

const MONTH_ABBR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

interface BulkActionBarProps {
  count: number;
  months: number[];
  onToggleMonth: (month: number) => void;
  onToggleAllMonths: () => void;
  availableStatuses: string[];
  onApply: (status: string) => void;
  onClear: () => void;
  onCancel: () => void;
}

export function BulkActionBar({
  count, months, onToggleMonth, onToggleAllMonths, availableStatuses, onApply, onClear, onCancel,
}: BulkActionBarProps) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const hasMonths = months.length > 0;
  const allMonthsSelected = months.length === 12;

  return (
    <div style={{
      background: 'var(--color-primary)',
      color: '#fff',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
      fontSize: 'var(--font-size-sm)',
    }}>
      <span style={{ fontWeight: 600 }}>
        {count} empresa{count !== 1 ? 's' : ''} selecionada{count !== 1 ? 's' : ''}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ opacity: 0.8 }}>Aplicar em:</span>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {MONTH_ABBR.map((label, i) => {
            const m = i + 1;
            const isSelected = months.includes(m);
            return (
              <button
                key={m}
                onClick={() => onToggleMonth(m)}
                title={label}
                style={{
                  padding: '4px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  border: '1px solid rgba(255,255,255,0.4)',
                  background: isSelected ? '#fff' : 'rgba(255,255,255,0.12)',
                  color: isSelected ? 'var(--color-primary)' : '#fff',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={onToggleAllMonths}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              whiteSpace: 'nowrap',
            }}
          >
            {allMonthsSelected ? 'Nenhum' : 'Todos'}
          </button>
        </div>
      </div>

      <select
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value)}
        style={{
          height: 30, padding: '0 8px',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 'var(--radius-sm)',
          color: '#fff', fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          cursor: 'pointer',
        }}
      >
        <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
          Selecionar status...
        </option>
        {availableStatuses.map((s) => (
          <option key={s} value={s} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {STATUS_CFG[s]?.label ?? s}
          </option>
        ))}
      </select>

      <button
        onClick={() => { if (selectedStatus && hasMonths) { onApply(selectedStatus); setSelectedStatus(''); } }}
        disabled={!selectedStatus || !hasMonths}
        style={{
          padding: '5px 14px', borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.15)', color: '#fff',
          fontWeight: 600, fontSize: 'var(--font-size-sm)',
          cursor: selectedStatus && hasMonths ? 'pointer' : 'not-allowed',
          opacity: selectedStatus && hasMonths ? 1 : 0.5,
          fontFamily: 'var(--font-family)',
        }}
      >
        Aplicar
      </button>

      <button
        onClick={onClear}
        disabled={!hasMonths}
        style={{
          padding: '5px 14px', borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255,255,255,0.5)',
          background: 'transparent', color: '#fff',
          fontSize: 'var(--font-size-sm)', cursor: hasMonths ? 'pointer' : 'not-allowed',
          opacity: hasMonths ? 1 : 0.5,
          fontFamily: 'var(--font-family)',
        }}
      >
        Limpar status
      </button>

      <button
        onClick={onCancel}
        style={{
          padding: '5px 14px', borderRadius: 'var(--radius-sm)',
          border: 'none', background: 'none', color: 'rgba(255,255,255,0.8)',
          fontSize: 'var(--font-size-sm)', cursor: 'pointer',
          marginLeft: 'auto',
          fontFamily: 'var(--font-family)',
        }}
      >
        Cancelar seleção
      </button>
    </div>
  );
}
