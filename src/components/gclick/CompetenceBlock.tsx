'use client';

import React from 'react';
import { UrgencyBadge, URGENCY_META, formatDueDate } from './UrgencyBadge';
import type { GClickCompetenceGroup } from '@/types/gclick';

interface CompetenceBlockProps {
  group: GClickCompetenceGroup;
  onToggleTask: (id: number, completed: boolean) => void;
}

export function CompetenceBlock({ group, onToggleTask }: CompetenceBlockProps) {
  const meta = URGENCY_META[group.urgency];

  return (
    <div style={{
      border: `1px solid ${meta.bg}`,
      borderRadius: 10,
      padding: '10px 12px',
      background: 'var(--bg-hover)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
          Competência {group.competence}
        </span>
        <UrgencyBadge urgency={group.urgency} dueDate={group.earliestDueDate} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {group.tasks.map((t) => (
          <label
            key={t.id}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={t.completed}
              onChange={(e) => onToggleTask(t.id, e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0, accentColor: 'var(--color-primary)' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              {t.action && (
                <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>{t.action}</p>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                {t.goal && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Meta: {t.goal}</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Vence: {formatDueDate(t.dueDate, t.dueDateRaw)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>{t.status}</span>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
