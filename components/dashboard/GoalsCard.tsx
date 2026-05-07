import Link from 'next/link';
import { Card, CardHeader, CardEmptyState } from './Card';
import { formatCurrency } from '@/lib/format';

export type GoalRow = {
  id: string;
  name: string;
  type: string;
  targetAmount: number | null;
  targetDate: Date | null;
};

type Props = {
  goals: GoalRow[];
};

function formatTargetDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function GoalsCard({ goals }: Props) {
  const top = goals.slice(0, 2);

  return (
    <Card>
      <CardHeader
        eyebrow="Goals"
        trailing={
          <Link
            href="/goals"
            style={{
              fontSize: 11,
              color: 'var(--color-text-dim)',
              fontFamily: 'var(--font-mono)',
              textDecoration: 'none',
            }}
          >
            view all
          </Link>
        }
      />
      {top.length === 0 ? (
        <CardEmptyState>No goals yet. Add one in onboarding or settings.</CardEmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {top.map((g) => {
            // Linkage to actual progress lands in Phase 5 — for now show 0/target.
            const target = g.targetAmount ?? 0;
            const current = 0;
            const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
            return (
              <div key={g.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 540, color: 'var(--color-text)' }}>
                    {g.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-dim)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {target > 0
                      ? `${formatCurrency(current, { maximumFractionDigits: 0 })} / ${formatCurrency(
                          target,
                          { maximumFractionDigits: 0 },
                        )}`
                      : 'no target set'}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'var(--color-bg-3)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'var(--color-mint)',
                    }}
                  />
                </div>
                {g.targetDate && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: 'var(--color-text-dim)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    by {formatTargetDate(g.targetDate)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
