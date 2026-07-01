'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'tight' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function Card({ children, className, padding = 'md', style }: CardProps) {
  const paddingMap = { tight: '10px 12px', sm: '12px', md: '20px', lg: '28px' };
  return (
    <div className={cn('card', className)} style={{ padding: paddingMap[padding], ...style }}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
