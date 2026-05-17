import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardHeader, CardEmptyState } from '@/components/dashboard/Card';
import { Eyebrow } from '@/components/ui';
import { formatCurrency, labelForCategory, formatTransactionDate } from '@/lib/format';

const NON_SPEND = new Set(['INCOME', 'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS']);

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export default async function SpendingPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const now = new Date();
  const currentStart = startOfMonth(now);
  const priorStart = startOfMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));

  const txs = await db.transaction.findMany({
    where: { userId, date: { gte: priorStart } },
    orderBy: { date: 'desc' },
    include: { account: { select: { institution: true } } },
  });

  // Aggregate by category for current + prior month, excluding non-spend.
  const byCategoryCurrent = new Map<string, number>();
  const byCategoryPrior = new Map<string, number>();
  let totalCurrent = 0;
  let totalPrior = 0;

  for (const t of txs) {
    if (t.pending || t.amount <= 0) continue;
    if (t.category && NON_SPEND.has(t.category)) continue;
    const key = t.category ?? 'UNCATEGORIZED';
    if (t.date >= currentStart) {
      byCategoryCurrent.set(key, (byCategoryCurrent.get(key) ?? 0) + t.amount);
      totalCurrent += t.amount;
    } else {
      byCategoryPrior.set(key, (byCategoryPrior.get(key) ?? 0) + t.amount);
      totalPrior += t.amount;
    }
  }

  const allCategories = new Set([...byCategoryCurrent.keys(), ...byCategoryPrior.keys()]);
  const rows = Array.from(allCategories)
    .map((cat) => ({
      category: cat,
      thisMonth: byCategoryCurrent.get(cat) ?? 0,
      lastMonth: byCategoryPrior.get(cat) ?? 0,
    }))
    .sort((a, b) => b.thisMonth - a.thisMonth);

  const max = rows.reduce((m, r) => Math.max(m, r.thisMonth, r.lastMonth), 0);

  // Recent transactions for the list — current month, settled, no transfers/income.
  const recent = txs.filter(
    (t) =>
      t.date >= currentStart &&
      !t.pending &&
      t.amount > 0 &&
      !(t.category && NON_SPEND.has(t.category)),
  );

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const delta = totalCurrent - totalPrior;
  const deltaPct = totalPrior > 0 ? Math.round((delta / totalPrior) * 100) : null;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: -0.6,
            margin: '0 0 4px',
            lineHeight: 1.1,
          }}
        >
          Spending
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Where your money is going this month, and how it compares to last.
        </p>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Card>
          <Eyebrow style={{ marginBottom: 6 }}>{monthLabel} so far</Eyebrow>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>
            {formatCurrency(totalCurrent, { maximumFractionDigits: 0 })}
          </div>
        </Card>
        <Card>
          <Eyebrow style={{ marginBottom: 6 }}>Last month</Eyebrow>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6, color: 'var(--color-text-muted)' }}>
            {formatCurrency(totalPrior, { maximumFractionDigits: 0 })}
          </div>
        </Card>
        <Card>
          <Eyebrow style={{ marginBottom: 6 }}>vs last month</Eyebrow>
          {totalPrior === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>No comparison yet</div>
          ) : (
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: -0.6,
                color: delta > 0 ? 'var(--color-warn)' : 'var(--color-mint)',
              }}
            >
              {delta >= 0 ? '+' : ''}
              {formatCurrency(delta, { maximumFractionDigits: 0 })}
              {deltaPct !== null && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {deltaPct >= 0 ? '+' : ''}
                  {deltaPct}%
                </span>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Category breakdown */}
      <div style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader
            eyebrow="By category"
            trailing={
              <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                {rows.length} categor{rows.length === 1 ? 'y' : 'ies'}
              </span>
            }
          />
          {rows.length === 0 ? (
            <CardEmptyState>No categorized spend yet this month.</CardEmptyState>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rows.map((r) => {
                const rowDelta = r.thisMonth - r.lastMonth;
                const up = rowDelta > 0;
                return (
                  <div key={r.category}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                        {labelForCategory(r.category)}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {formatCurrency(r.thisMonth, { maximumFractionDigits: 0 })}
                        {rowDelta !== 0 && r.lastMonth > 0 && (
                          <span
                            style={{
                              marginLeft: 8,
                              color: up ? 'var(--color-warn)' : 'var(--color-mint)',
                            }}
                          >
                            {up ? '+' : ''}
                            {formatCurrency(rowDelta, { maximumFractionDigits: 0 })}
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
                          width: `${max > 0 ? (r.lastMonth / max) * 100 : 0}%`,
                          background: 'var(--color-line-2)',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${max > 0 ? (r.thisMonth / max) * 100 : 0}%`,
                          background: 'var(--color-mint)',
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
      </div>

      {/* Transactions list */}
      <Card>
        <CardHeader
          eyebrow={`${monthLabel} transactions`}
          trailing={
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              {recent.length} entr{recent.length === 1 ? 'y' : 'ies'}
            </span>
          }
        />
        {recent.length === 0 ? (
          <CardEmptyState>No spend transactions yet for this month.</CardEmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map((t) => (
              <Link
                key={t.id}
                href={`/accounts/${t.accountId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textDecoration: 'none',
                  color: 'var(--color-text)',
                  padding: '6px 0',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 540,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.merchantName ?? t.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {formatTransactionDate(t.date)} · {labelForCategory(t.category)} · {t.account.institution}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text)',
                    flexShrink: 0,
                  }}
                >
                  −{formatCurrency(t.amount, { currency: t.currency, maximumFractionDigits: 0 })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
