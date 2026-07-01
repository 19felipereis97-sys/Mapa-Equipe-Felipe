'use client';

import React, { useState } from 'react';
import { STATUS_CFG } from './StatusSelector';

interface BulkActionBarProps {
  count: number;
  month: number;
  onMonthChange: (month: number) => void;
  availableStatuses: string[];
  onApply: (status: string) => void;
  onClear: () => void;
  onCancel: () => void;
}

export function BulkActionBar({
  count, month, onMonthChange, availableStatuses, onApply, onClear, onCancel,
}: BulkActionBarProps) {
  const [selectedStatus, setSelectedStatus] = useState('');

  const MONTH_ABBR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

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

      <span style={{ opacity: 0.8 }}>
        Aplicar em:
      </span>

      <select
        value={month}
        onChange={(e) => onMonthChange(Number(e.target.value))}
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
        {MONTH_ABBR.map((label, i) => (
          <option key={i + 1} value={i + 1} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {label}
          </option>
        ))}
      </select>

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
        onClick={() => { if (selectedStatus) { onApply(selectedStatus); setSelectedStatus(''); } }}
        disabled={!selectedStatus}
        style={{
          padding: '5px 14px', borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.15)', color: '#fff',
          fontWeight: 600, fontSize: 'var(--font-size-sm)',
          cursor: selectedStatus ? 'pointer' : 'not-allowed',
          opacity: selectedStatus ? 1 : 0.5,
          fontFamily: 'var(--font-family)',
        }}
      >
        Aplicar
      </button>

      <button
        onClick={onClear}
        style={{
          padding: '5px 14px', borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255,255,255,0.5)',
          background: 'transparent', color: '#fff',
          fontSize: 'var(--font-size-sm)', cursor: 'pointer',
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
