import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card } from '@/components/dashboard/Card';
import { BBtn, ArrowIcon, PlusIcon } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const goals = await db.goal.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div style={{ maxWidth: 960 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 18,
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: -0.6,
              margin: '0 0 4px',
              lineHeight: 1.1,
            }}
          >
            Goals
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            What you are working toward. Beacon plans contributions and adjusts as life changes.
          </p>
        </div>
        <Link href="/goals/new" style={{ textDecoration: 'none' }}>
          <BBtn
            variant="primary"
            size="md"
            trailing={<PlusIcon size={14} color="var(--color-mint-ink)" />}
          >
            New goal
          </BBtn>
        </Link>
      </div>

      {goals.length === 0 ? (
        <div
          style={{
            padding: 40,
            background: 'var(--color-bg-2)',
            border: '1px dashed var(--color-line-2)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <div>No goals yet.</div>
          <Link href="/goals/new" style={{ color: 'var(--color-mint)', fontSize: 13, marginTop: 8, display: 'inline-block' }}>
            Add your first goal →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {goals.map((g) => {
            const target = g.targetAmount ?? 0;
            const current = 0; // goal-to-account linkage is later; placeholder for now
            const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
            const targetDateStr = g.targetDate
              ? g.targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : null;
            return (
              <Link key={g.id} href={`/goals/${g.id}`} style={{ textDecoration: 'none' }}>
                <Card>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                      {g.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-dim)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 12,
                      }}
                    >
                      {g.type}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <span>
                        {target > 0
                          ? `${formatCurrency(current, { maximumFractionDigits: 0 })} of ${formatCurrency(target, { maximumFractionDigits: 0 })}`
                          : 'no target set'}
                      </span>
                      {targetDateStr && <span>by {targetDateStr}</span>}
                    </div>

                    <div
                      style={{
                        height: 4,
                        background: 'var(--color-bg-3)',
                        borderRadius: 2,
                        overflow: 'hidden',
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-mint)' }} />
                    </div>

                    <div style={{ flex: 1 }} />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: 'var(--color-mint)',
                        fontSize: 12,
                        fontWeight: 540,
                      }}
                    >
                      Open <ArrowIcon size={11} color="var(--color-mint)" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
