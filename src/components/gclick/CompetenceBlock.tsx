'use client';

import React from 'react';
import { UrgencyBadge, URGENCY_META, formatIfDate } from './UrgencyBadge';
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
      borderRadius: 8,
      padding: '7px 10px',
      background: 'var(--bg-hover)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
          {group.competence}
        </span>
        <UrgencyBadge urgency={group.urgency} dueDate={group.earliestDueDate} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {group.tasks.map((t) => {
          const action = formatIfDate(t.action);
          const goal = formatIfDate(t.goal);
          return (
            <label
              key={t.id}
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'baseline', gap: 6, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={t.completed}
                onChange={(e) => onToggleTask(t.id, e.target.checked)}
                style={{ flexShrink: 0, accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {action && <span style={{ color: 'var(--text-primary)' }}>{action}</span>}
                {action && (goal || t.status) && ' · '}
                {goal && <>Meta {goal}</>}
                {goal && t.status && ' · '}
                {t.status && <span style={{ color: 'var(--text-placeholder)' }}>{t.status}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
