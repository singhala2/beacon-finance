import { Card, CardHeader } from './Card';
import { formatCurrency } from '@/lib/format';

export type AccountRow = {
  id: string;
  institution: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  balanceCurrent: number | null;
  currency: string;
};

type Props = {
  accounts: AccountRow[];
};

export function AccountsCard({ accounts }: Props) {
  // Top 4 by absolute balance, all types
  const top = [...accounts]
    .sort((a, b) => Math.abs(b.balanceCurrent ?? 0) - Math.abs(a.balanceCurrent ?? 0))
    .slice(0, 4);

  return (
    <Card>
      <CardHeader
        eyebrow="Accounts"
        trailing={
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
            {accounts.length} total
          </span>
        }
      />
      {top.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
            padding: '8px 0',
            lineHeight: 1.5,
          }}
        >
          No accounts connected.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top.map((a) => {
            const isCredit = a.type === 'credit';
            const balance = a.balanceCurrent ?? 0;
            const displayValue = isCredit ? -Math.abs(balance) : balance;
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: 'var(--color-bg-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  {a.institution[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 540,
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
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    color: displayValue < 0 ? 'var(--color-warn)' : 'var(--color-text)',
                    flexShrink: 0,
                  }}
                >
                  {formatCurrency(displayValue, { currency: a.currency, maximumFractionDigits: 0 })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
