'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  }[variant];

  const sizeClass = { sm: 'btn-sm', md: '', lg: 'btn-lg' }[size];

  return (
    <button
      className={cn('btn', variantClass, sizeClass, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" style={{ width: 14, height: 14, marginRight: 4 }} />}
      {children}
    </button>
  );
}
