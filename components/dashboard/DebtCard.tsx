import { Card, CardHeader } from './Card';
import { formatCurrency } from '@/lib/format';
import type { AccountRow } from './AccountsCard';

type Props = {
  // Pass in only credit-type accounts; the card sums them.
  creditAccounts: AccountRow[];
};

export function DebtCard({ creditAccounts }: Props) {
  const total = creditAccounts.reduce(
    (sum, a) => sum + Math.abs(a.balanceCurrent ?? 0),
    0,
  );

  return (
    <Card>
      <CardHeader eyebrow="Debt" />
      {creditAccounts.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
            padding: '8px 0',
            lineHeight: 1.5,
          }}
        >
          No credit accounts connected.
        </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {creditAccounts.slice(0, 3).map((a) => (
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
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-dim)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {a.subtype ?? a.type}
                    {a.mask ? ` · ${a.mask}` : ''}
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
                  {formatCurrency(Math.abs(a.balanceCurrent ?? 0), {
                    currency: a.currency,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
