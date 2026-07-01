'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export const MONTH_ABBR_PT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'] as const;

export type TravaRequester = 'Equipe' | 'Setor Fiscal' | 'DP';

interface TravaAbertoModalProps {
  open: boolean;
  companyName: string;
  month: number;   // mês a partir do qual a trava será aberta (1-12)
  year: string;
  onConfirm: (requester: TravaRequester) => void;
  onCancel: () => void;
}

export function TravaAbertoModal({
  open, companyName, month, year, onConfirm, onCancel,
}: TravaAbertoModalProps) {
  const [requester, setRequester] = useState<TravaRequester>('Equipe');

  useEffect(() => {
    if (open) setRequester('Equipe');
  }, [open]);

  const monthLabel = MONTH_ABBR_PT[month - 1];

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Liberar Trava Contábil"
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirm(requester)}>Confirmar</Button>
        </div>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 2 }}>
          {companyName}
        </p>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-placeholder)' }}>
          <strong>{monthLabel}/{year}</strong> em diante será marcado como{' '}
          <strong>Aberto</strong>. Os meses anteriores permanecem com OK.
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">Quem solicitou a abertura?</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          {(['Equipe', 'Setor Fiscal', 'DP'] as TravaRequester[]).map((opt) => (
            <label
              key={opt}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', fontSize: 'var(--font-size-sm)',
                color: requester === opt ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: requester === opt ? 600 : 400,
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${requester === opt ? 'var(--color-primary)' : 'var(--border-color)'}`,
                background: requester === opt ? 'var(--color-primary-soft)' : 'var(--bg-card)',
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
            >
              <input
                type="radio"
                name="requester"
                value={opt}
                checked={requester === opt}
                onChange={() => setRequester(opt)}
                style={{ display: 'none' }}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
