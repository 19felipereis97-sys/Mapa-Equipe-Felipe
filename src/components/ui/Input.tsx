'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn('form-input', error && 'border-color: var(--color-danger)', className)}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
