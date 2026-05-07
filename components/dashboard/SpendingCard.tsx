import { Card, CardHeader } from './Card';
import { formatCurrency, labelForCategory } from '@/lib/format';

export type CategorySpend = {
  category: string;
  thisMonth: number;
  lastMonth: number;
};

type Props = {
  categories: CategorySpend[]; // expected pre-sorted, top 5
};

const COLORS = [
  'var(--color-mint)',
  'var(--color-indigo)',
  'var(--color-warn)',
  'var(--color-text-muted)',
  'var(--color-text-dim)',
];

export function SpendingCard({ categories }: Props) {
  const top = categories.slice(0, 5);
  const isEmpty = top.length === 0;
  const max = top.reduce((m, c) => Math.max(m, c.thisMonth, c.lastMonth), 0);

  return (
    <Card>
      <CardHeader eyebrow="Spending" />
      {isEmpty ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0', lineHeight: 1.5 }}>
          No categorized spend this month yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top.map((c, i) => {
            const delta = c.thisMonth - c.lastMonth;
            const up = delta > 0;
            const color = COLORS[i] ?? 'var(--color-text-muted)';
            return (
              <div key={c.category}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 12.5, color: 'var(--color-text)' }}>
                    {labelForCategory(c.category)}
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {formatCurrency(c.thisMonth, { maximumFractionDigits: 0 })}
                    {delta !== 0 && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: up ? 'var(--color-warn)' : 'var(--color-mint)',
                        }}
                      >
                        {up ? '+' : ''}
                        {formatCurrency(delta, { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </span>
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: 6,
                    background: 'var(--color-bg-3)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${max > 0 ? (c.lastMonth / max) * 100 : 0}%`,
                      background: 'var(--color-line-2)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${max > 0 ? (c.thisMonth / max) * 100 : 0}%`,
                      background: color,
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div
            style={{
              display: 'flex',
              gap: 14,
              fontSize: 10.5,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-dim)',
              marginTop: 4,
            }}
          >
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  background: 'var(--color-mint)',
                  borderRadius: 2,
                  marginRight: 5,
                  verticalAlign: 'middle',
                }}
              />
              this month
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  background: 'var(--color-line-2)',
                  borderRadius: 2,
                  marginRight: 5,
                  verticalAlign: 'middle',
                }}
              />
              last month
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
