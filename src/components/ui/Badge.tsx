'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'ok' | 'sm' | 'p' | 'sti' | 'stc' | 'primary' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  );
}
