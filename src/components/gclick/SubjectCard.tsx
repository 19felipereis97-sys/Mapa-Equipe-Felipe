'use client';

import React, { useState } from 'react';
import { ClientCard } from './ClientCard';
import { UrgencyBadge, formatDueDate } from './UrgencyBadge';
import { Button } from '@/components/ui/Button';
import type { GClickSubjectGroup } from '@/types/gclick';

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  if (value === 0 && danger) return null;
  return (
    <div>
      <p style={{ fontSize: 20, fontWeight: 800, color: danger ? 'var(--color-danger)' : 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
        {label}
      </p>
    </div>
  );
}

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

  return (
    <div className={`gclick-subject-card${removing ? ' gclick-card-removing' : ''}`}>
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ cursor: 'pointer' }}
        role="button"
        aria-expanded={expanded}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{group.subject}</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{group.department}</p>
          </div>
          <UrgencyBadge urgency={group.urgency} dueDate={group.earliestDueDate} />
        </div>

        <div style={{ display: 'flex', gap: 22, marginTop: 16, flexWrap: 'wrap' }}>
          <Stat label="Clientes" value={group.clientCount} />
          <Stat label="Competências" value={group.competenceCount} />
          <Stat label="Tarefas" value={group.taskCount} />
          <Stat label="Vencidas" value={group.overdueCount} danger />
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-placeholder)', marginTop: 12 }}>
          {group.earliestDueDate ? (
            <>1º vencimento {formatDueDate(group.earliestDueDate)} · último {formatDueDate(group.latestDueDate)}</>
          ) : 'Sem vencimentos informados'}
        </p>

        <p style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, marginTop: 10 }}>
          {expanded ? '▲ Recolher clientes' : '▼ Ver clientes'}
        </p>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        <Button variant="primary" size="sm" onClick={onCompleteSubject}>
          ✓ Concluir Assunto
        </Button>
      </div>
    </div>
  );
}
