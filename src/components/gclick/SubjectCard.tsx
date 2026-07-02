'use client';

import React, { useState } from 'react';
import { ClientCard } from './ClientCard';
import { UrgencyBadge, formatDueDate } from './UrgencyBadge';
import { Button } from '@/components/ui/Button';
import type { GClickSubjectGroup } from '@/types/gclick';

interface SubjectCardProps {
  group: GClickSubjectGroup;
  removing?: boolean;
  removingClientKeys: Set<string>;
  onToggleTask: (id: number, completed: boolean) => void;
  onCompleteSubject: () => void;
  onCompleteClient: (clientCode: string | null, clientName: string) => void;
}

export function SubjectCard({
  group, removing, removingClientKeys, onToggleTask, onCompleteSubject, onCompleteClient,
}: SubjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  // Só mostra a data mais distante quando ela difere da 1ª — o badge já cobre
  // o vencimento mais próximo, não faz sentido repetir o mesmo dia duas vezes.
  const hasDueRange = group.earliestDueDate && group.latestDueDate && group.earliestDueDate !== group.latestDueDate;

  return (
    <div className={`gclick-subject-card${removing ? ' gclick-card-removing' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div
          onClick={() => setExpanded((v) => !v)}
          style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}
          role="button"
          aria-expanded={expanded}
        >
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{group.subject}</p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{group.department}</p>

          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
            {group.clientCount} cliente{group.clientCount !== 1 ? 's' : ''} · {group.competenceCount} competência{group.competenceCount !== 1 ? 's' : ''} · {group.taskCount} tarefa{group.taskCount !== 1 ? 's' : ''}
            {group.overdueCount > 0 && (
              <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}> · {group.overdueCount} vencida{group.overdueCount !== 1 ? 's' : ''}</span>
            )}
            {hasDueRange && ` · até ${formatDueDate(group.latestDueDate)}`}
          </p>

          <p style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, marginTop: 6 }}>
            {expanded ? '▲ Recolher' : '▼ Ver clientes'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <UrgencyBadge urgency={group.urgency} dueDate={group.earliestDueDate} />
          <Button variant="primary" size="sm" onClick={onCompleteSubject}>✓ Concluir</Button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {group.clients.map((c) => {
            const key = c.clientCode ?? c.clientName;
            return (
              <ClientCard
                key={key}
                client={c}
                removing={removingClientKeys.has(`${group.subject}::${key}`)}
                onToggleTask={onToggleTask}
                onCompleteClient={() => onCompleteClient(c.clientCode, c.clientName)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
