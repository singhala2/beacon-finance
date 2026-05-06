import type { CSSProperties } from 'react';

type Props = {
  total: number;
  current: number;
  style?: CSSProperties;
};

export function BStepDots({ total, current, style }: Props) {
  return (
    <div style={{ display: 'flex', gap: 4, ...style }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          style={{
            height: 3,
            flex: 1,
            background:
              i < current
                ? 'var(--color-mint)'
                : i === current
                ? 'var(--color-mint-dim)'
                : 'var(--color-line)',
            borderRadius: 2,
            transition: 'background .25s',
          }}
        />
      ))}
    </div>
  );
}
