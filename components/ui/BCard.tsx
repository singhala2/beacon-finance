import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number;
  onClick?: MouseEventHandler<HTMLDivElement>;
};

export function BCard({ children, style, padding = 20, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-bg-2)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-lg)',
        padding,
        cursor: onClick ? 'pointer' : undefined,
        transition: 'border-color .15s, background .15s',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
