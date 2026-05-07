import type { CSSProperties, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  padding?: number;
  style?: CSSProperties;
};

// Standard surface for dashboard cards: bg2, line, lg radius. Fills its grid
// cell vertically so cards in the same row equalize height.
export function Card({ children, padding = 18, style }: Props) {
  return (
    <div
      style={{
        background: 'var(--color-bg-2)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-lg)',
        padding,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Centered empty-state. Use inside a Card so it fills remaining vertical
// space and the message reads neatly when row heights are equalized.
export function CardEmptyState({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--color-text-muted)',
        lineHeight: 1.5,
        padding: '8px 4px',
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
