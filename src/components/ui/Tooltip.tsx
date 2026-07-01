'use client';

import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'right' | 'top' | 'bottom';
}

export function Tooltip({ content, children, position = 'right' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionStyles: React.CSSProperties =
    position === 'right'
      ? { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }
      : position === 'top'
      ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }
      : { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="tooltip-box" style={positionStyles}>
          {content}
        </div>
      )}
    </div>
  );
}
