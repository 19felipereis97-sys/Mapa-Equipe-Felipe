'use client';

import React from 'react';
import type { Status } from '@/types/common';
import { STATUS_BADGE_CLASS, STATUS_LABELS } from '@/constants/statuses';
import { Badge } from './Badge';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variantMap: Record<string, 'ok' | 'sm' | 'p' | 'sti' | 'stc'> = {
    'badge-ok': 'ok',
    'badge-sm': 'sm',
    'badge-p': 'p',
    'badge-sti': 'sti',
    'badge-stc': 'stc',
  };
  const cssClass = STATUS_BADGE_CLASS[status];
  const variant = variantMap[cssClass] ?? 'primary';

  return (
    <Badge variant={variant} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
