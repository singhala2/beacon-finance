'use client';

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

const sizes: Record<Size, { h: number; px: number; fs: number; gap: number }> = {
  sm: { h: 32, px: 12, fs: 13, gap: 6 },
  md: { h: 44, px: 18, fs: 15, gap: 8 },
  lg: { h: 52, px: 22, fs: 16, gap: 10 },
};

const variants: Record<Variant, { bg: string; color: string; border: string }> = {
  primary: { bg: 'var(--color-mint)', color: 'var(--color-mint-ink)', border: 'transparent' },
  secondary: { bg: 'var(--color-bg-3)', color: 'var(--color-text)', border: 'var(--color-line-2)' },
  ghost: { bg: 'transparent', color: 'var(--color-text-muted)', border: 'transparent' },
  outline: { bg: 'transparent', color: 'var(--color-text)', border: 'var(--color-line-2)' },
};

export function BBtn({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth,
  leading,
  trailing,
  disabled,
  style,
  ...rest
}: Props) {
  const s = sizes[size];
  const v = variants[variant];

  const base: CSSProperties = {
    height: s.h,
    padding: `0 ${s.px}px`,
    fontSize: s.fs,
    gap: s.gap,
    background: v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 540,
    letterSpacing: -0.1,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : undefined,
    transition: 'transform .08s ease, background .12s ease',
  };

  return (
    <button
      {...rest}
      disabled={disabled}
      style={{ ...base, ...style }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
        rest.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = '';
        rest.onMouseUp?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        rest.onMouseLeave?.(e);
      }}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
