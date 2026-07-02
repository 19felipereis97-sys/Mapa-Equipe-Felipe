'use client';

import React from 'react';
import type { Urgency } from '@/types/gclick';

export const URGENCY_META: Record<Urgency, { label: string; text: string; bg: string }> = {
  overdue: { label: 'Vencido',    text: 'var(--gclick-overdue-text)', bg: 'var(--gclick-overdue-bg)' },
  today:   { label: 'Vence hoje', text: 'var(--gclick-today-text)',   bg: 'var(--gclick-today-bg)'   },
  soon:    { label: 'Até 3 dias', text: 'var(--gclick-soon-text)',    bg: 'var(--gclick-soon-bg)'    },
  ok:      { label: 'No prazo',   text: 'var(--gclick-ok-text)',      bg: 'var(--gclick-ok-bg)'      },
};

export function formatDueDate(dateStr: string | null, raw?: string | null): string {
  if (!dateStr) return raw || 'Sem vencimento';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return raw || 'Sem vencimento';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface UrgencyBadgeProps {
  urgency: Urgency;
  dueDate: string | null;
  dueDateRaw?: string | null;
}

export function UrgencyBadge({ urgency, dueDate, dueDateRaw }: UrgencyBadgeProps) {
  const meta = URGENCY_META[urgency];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
      background: meta.bg, color: meta.text, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {formatDueDate(dueDate, dueDateRaw)}
    </span>
  );
}
