import { Card, CardHeader, CardEmptyState } from './Card';
import { formatCurrency } from '@/lib/format';
import type { AccountRow } from './AccountsCard';

type Props = {
  // Pass credit + loan accounts; card sums their absolute balances as total debt.
  debtAccounts: AccountRow[];
  // accountId → last-30-day spend (positive number). Surfaces CC charges-in-progress.
  spendLast30ById?: Record<string, number>;
};

export function DebtCard({ debtAccounts, spendLast30ById }: Props) {
  const total = debtAccounts.reduce((sum, a) => sum + Math.abs(a.balanceCurrent ?? 0), 0);
  // Sort: credit cards first (active spend), then loans by balance.
  const sorted = [...debtAccounts].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'credit' ? -1 : 1;
    return Math.abs(b.balanceCurrent ?? 0) - Math.abs(a.balanceCurrent ?? 0);
  });

  return (
    <Card>
      <CardHeader eyebrow="Debt" />
      {sorted.length === 0 ? (
        <CardEmptyState>No credit or loan accounts connected.</CardEmptyState>
      ) : (
        <>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: -0.6,
              marginBottom: 12,
              color: total > 0 ? 'var(--color-warn)' : 'var(--color-text)',
            }}
          >
            {formatCurrency(total, { maximumFractionDigits: 0 })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.slice(0, 4).map((a) => {
              const balance = Math.abs(a.balanceCurrent ?? 0);
              const isCredit = a.type === 'credit';
              const recentSpend = spendLast30ById?.[a.id];
              const subline = isCredit
                ? recentSpend && recentSpend > 0
                  ? `${formatCurrency(recentSpend, { maximumFractionDigits: 0 })} spent · 30d`
                  : `${a.subtype ?? a.type}${a.mask ? ` · ${a.mask}` : ''}`
                : `${a.subtype ?? a.type}${a.mask ? ` · ${a.mask}` : ''}`;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: 'var(--color-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {a.institution}
                      {a.name && a.name !== a.institution ? (
                        <span style={{ color: 'var(--color-text-dim)' }}> · {a.name}</span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-dim)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {subline}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-warn)',
                      flexShrink: 0,
                    }}
                  >
                    {formatCurrency(balance, {
                      currency: a.currency,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
