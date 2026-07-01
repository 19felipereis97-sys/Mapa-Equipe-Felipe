'use client';

import React, { useEffect, useState } from 'react';
import { getCompetenceMonth } from '@/lib/utils';

interface DeadlineAlert {
  obligationCode: string;
  obligationName: string;
  dueDay: number;
  pendingCount: number;
  daysUntilDue: number;
  severity: 'expired' | 'urgent' | 'attention';
}

const SESSION_KEY = 'mapa:deadline-banner-dismissed';

export function DeadlineBanner() {
  const [alerts, setAlerts] = useState<DeadlineAlert[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const month = getCompetenceMonth();
    const year  = new Date().getFullYear();

    fetch(`/api/dashboard?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((json) => {
        const all: DeadlineAlert[] = json.data?.deadlineAlerts ?? [];
        const relevant = all.filter((a) => a.severity === 'expired' || a.severity === 'urgent');
        if (relevant.length > 0) {
          setAlerts(relevant);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  if (!visible || alerts.length === 0) return null;

  const expiredCount = alerts.filter((a) => a.severity === 'expired').length;
  const urgentCount  = alerts.filter((a) => a.severity === 'urgent').length;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: expiredCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)',
      color: '#fff', padding: '8px 16px',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      fontSize: 'var(--font-size-sm)', fontWeight: 500,
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      <span style={{ fontSize: 16 }}>⏰</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {expiredCount > 0 && <strong>{expiredCount} prazo{expiredCount !== 1 ? 's' : ''} vencido{expiredCount !== 1 ? 's' : ''}</strong>}
        {expiredCount > 0 && urgentCount > 0 && ' · '}
        {urgentCount > 0 && <strong>{urgentCount} urgente{urgentCount !== 1 ? 's' : ''}</strong>}
        {' — '}
        {alerts.map((a) => a.obligationName).join(', ')}
        {'. '}
        <a href="/dashboard" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 700 }}>
          Ver no Dashboard
        </a>
      </span>
      <button
        onClick={dismiss}
        aria-label="Fechar alerta"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 18, lineHeight: 1, padding: '0 4px', opacity: 0.85, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}
