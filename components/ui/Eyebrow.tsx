import type { ReactNode, CSSProperties } from 'react';

type Props = {
  children: ReactNode;
  color?: string; // CSS var, defaults to dim
  style?: CSSProperties;
};

export function Eyebrow({ children, color = 'var(--color-text-dim)', style }: Props) {
  return (
    <div
      style={{
        fontSize: 11,
        color,
        fontFamily: 'var(--font-mono)',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
