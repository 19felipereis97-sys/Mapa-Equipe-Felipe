'use client';

import React from 'react';
import { CompetenceBlock } from './CompetenceBlock';
import { UrgencyBadge } from './UrgencyBadge';
import { Button } from '@/components/ui/Button';
import type { GClickClientGroup } from '@/types/gclick';

interface ClientCardProps {
  client: GClickClientGroup;
  removing?: boolean;
  onToggleTask: (id: number, completed: boolean) => void;
  onCompleteClient: () => void;
}

export function ClientCard({ client, removing, onToggleTask, onCompleteClient }: ClientCardProps) {
  return (
    <div className={`gclick-client-card${removing ? ' gclick-card-removing' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {client.clientCode && (
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)', marginRight: 6 }}>
                {client.clientCode}
              </span>
            )}
            {client.clientName}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
            {client.competences.length} competência{client.competences.length !== 1 ? 's' : ''} · {client.taskCount} tarefa{client.taskCount !== 1 ? 's' : ''}
            {client.clientStatus && ` · ${client.clientStatus}`}
          </p>
        </div>
        <UrgencyBadge urgency={client.urgency} dueDate={client.earliestDueDate} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {client.competences.map((c) => (
          <CompetenceBlock key={c.competence} group={c} onToggleTask={onToggleTask} />
        ))}
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onCompleteClient}>
          ✓ Concluir Cliente
        </Button>
      </div>
    </div>
  );
}
