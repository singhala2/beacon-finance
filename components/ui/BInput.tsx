'use client';

import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  onChange?: (value: string) => void;
  leading?: ReactNode;
  containerStyle?: CSSProperties;
};

export function BInput({ value, onChange, type = 'text', leading, containerStyle, ...rest }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--color-bg-4)',
        border: '1px solid var(--color-line-2)',
        borderRadius: 'var(--radius-md)',
        padding: '0 14px',
        height: 48,
        ...containerStyle,
      }}
    >
      {leading}
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        type={type}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--color-text)',
          fontSize: 15,
          fontFamily: 'var(--font-sans)',
        }}
      />
    </div>
  );
}
