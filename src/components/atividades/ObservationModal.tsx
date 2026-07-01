'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const CONFIG: Record<string, { title: string; label: string; placeholder: string; required: boolean }> = {
  'P': {
    title: 'Registrar Pendência',
    label: 'Motivo (obrigatório)',
    placeholder: 'Descreva o motivo da pendência...',
    required: true,
  },
  'ST-I': {
    title: 'Standby Interno',
    label: 'Motivo (obrigatório)',
    placeholder: 'Descreva o motivo do standby interno...',
    required: true,
  },
  'ST-C': {
    title: 'Standby Cliente',
    label: 'Comentário (opcional)',
    placeholder: 'Comentário opcional...',
    required: false,
  },
};

interface ObservationModalProps {
  open: boolean;
  status: string;
  companyName: string;
  period: string;           // e.g. "MAI/2026" or "2026"
  initialObs?: string | null;
  onConfirm: (observation: string | null) => void;
  onCancel: () => void;
}

export function ObservationModal({
  open, status, companyName, period, initialObs, onConfirm, onCancel,
}: ObservationModalProps) {
  const [obs, setObs] = useState(initialObs ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cfg = CONFIG[status];

  useEffect(() => {
    if (open) {
      setObs(initialObs ?? '');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open, initialObs]);

  if (!cfg) return null;

  const canConfirm = !cfg.required || obs.trim().length > 0;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(obs.trim() || null);
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={cfg.title}
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!canConfirm}>Confirmar</Button>
        </div>
      }
    >
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 2 }}>
          {companyName}
        </p>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-placeholder)' }}>{period}</p>
      </div>

      <div className="form-group">
        <label className="form-label">{cfg.label}</label>
        <textarea
          ref={textareaRef}
          className="form-input"
          style={{ height: 90, resize: 'vertical', paddingTop: 8, paddingBottom: 8, lineHeight: 1.5 }}
          placeholder={cfg.placeholder}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleConfirm();
          }}
        />
        {cfg.required && obs.trim().length === 0 && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>
            Campo obrigatório para este status
          </span>
        )}
      </div>
    </Modal>
  );
}
