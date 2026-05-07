import type { CSSProperties, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  padding?: number;
  style?: CSSProperties;
};

// Standard surface for dashboard cards: bg2, line, lg radius.
export function Card({ children, padding = 18, style }: Props) {
  return (
    <div
      style={{
        background: 'var(--color-bg-2)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-lg)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type HeaderProps = {
  eyebrow: string;
  trailing?: ReactNode;
};

export function CardHeader({ eyebrow, trailing }: HeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-text-dim)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {eyebrow}
      </div>
      {trailing && <div style={{ marginLeft: 'auto' }}>{trailing}</div>}
    </div>
  );
}
