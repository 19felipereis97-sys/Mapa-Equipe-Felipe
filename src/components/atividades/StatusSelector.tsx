'use client';

import React, { useEffect, useRef } from 'react';

export const STATUS_CFG: Record<string, { bg: string; color: string; label: string; needsObs: boolean }> = {
  'OK':     { bg: 'var(--status-ok-bg)',     color: 'var(--status-ok-text)',     label: 'OK',     needsObs: false },
  'S/M':    { bg: 'var(--status-sm-bg)',     color: 'var(--status-sm-text)',     label: 'S/M',    needsObs: false },
  'P':      { bg: 'var(--status-p-bg)',      color: 'var(--status-p-text)',      label: 'P',      needsObs: true  },
  'ST-I':   { bg: 'var(--status-sti-bg)',    color: 'var(--status-sti-text)',    label: 'ST-I',   needsObs: true  },
  'ST-C':   { bg: 'var(--status-stc-bg)',    color: 'var(--status-stc-text)',    label: 'ST-C',   needsObs: false },
  'ABERTO': { bg: 'var(--status-aberto-bg)', color: 'var(--status-aberto-text)', label: 'Aberto', needsObs: false },
  'PREJUIZO':   { bg: 'var(--status-prejuizo-bg)',   color: 'var(--status-prejuizo-text)',   label: 'Prejuízo',   needsObs: false },
  'COTA_UNICA': { bg: 'var(--status-cotaunica-bg)',  color: 'var(--status-cotaunica-text)',  label: 'Cota Única', needsObs: false },
};

interface StatusSelectorProps {
  rect: DOMRect;
  currentStatus: string | null;
  availableStatuses: string[];
  onSelect: (status: string) => void;   // called for all statuses; caller decides if modal needed
  onClear: () => void;
  onClose: () => void;
}

export function StatusSelector({
  rect, currentStatus, availableStatuses, onSelect, onClear, onClose,
}: StatusSelectorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function down(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [onClose]);

  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.min(Math.max(8, rect.left - 50), vw - 240);
  const top  = rect.bottom + 5 + 240 > vh ? rect.top - 5 : rect.bottom + 5;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', top, left, zIndex: 200,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 180,
      }}
    >
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {availableStatuses.map((s) => {
          const c = STATUS_CFG[s];
          if (!c) return null;
          const isActive = currentStatus === s;
          return (
            <button
              key={s}
              onClick={() => onSelect(s)}
              style={{
                padding: '4px 10px', borderRadius: 4,
                fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: isActive ? c.color : c.bg,
                color: isActive ? '#fff' : c.color,
                outline: isActive ? `2px solid ${c.color}` : 'none',
                outlineOffset: 1,
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {currentStatus && (
        <button
          onClick={onClear}
          style={{
            padding: '3px 8px', borderRadius: 4,
            fontSize: 11, fontWeight: 600, border: '1px solid var(--border-color)',
            cursor: 'pointer', background: 'none',
            color: 'var(--color-danger)',
            textAlign: 'left',
          }}
        >
          Limpar status
        </button>
      )}
    </div>
  );
}
