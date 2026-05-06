'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  selected?: boolean;
  leading?: ReactNode;
};

export function BChip({ children, selected, leading, style, ...rest }: Props) {
  return (
    <button
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        background: selected ? 'oklch(0.82 0.14 165 / 0.12)' : 'var(--color-bg-3)',
        color: selected ? 'var(--color-mint)' : 'var(--color-text)',
        border: `1px solid ${selected ? 'var(--color-mint)' : 'var(--color-line)'}`,
        borderRadius: 'var(--radius-pill)',
        fontSize: 14,
        fontFamily: 'var(--font-sans)',
        fontWeight: 480,
        cursor: 'pointer',
        transition: 'all .12s',
        ...style,
      }}
    >
      {leading}
      {children}
    </button>
  );
}
