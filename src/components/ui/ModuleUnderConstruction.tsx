import React from 'react';
import { Card } from './Card';

interface ModuleUnderConstructionProps {
  title: string;
  subtitle: string;
  description?: string;
}

export function ModuleUnderConstruction({
  title,
  subtitle,
  description = 'As funcionalidades deste módulo serão implementadas nas próximas etapas do projeto.',
}: ModuleUnderConstructionProps) {
  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, fontSize: 'var(--font-size-md)' }}>
              Módulo em construção
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)', lineHeight: 1.6 }}>
              {description}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
