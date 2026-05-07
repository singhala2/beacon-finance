import Link from 'next/link';
import { Card, CardHeader } from './Card';
import { formatCurrency, formatTransactionDate, labelForCategory } from '@/lib/format';

export type TransactionRow = {
  id: string;
  date: Date;
  amount: number; // positive = outflow per Plaid convention
  currency: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  pending: boolean;
  accountInstitution: string;
};

type Props = {
  transactions: TransactionRow[]; // expected pre-sorted desc by date, max 5
};

export function ActivityCard({ transactions }: Props) {
  const top = transactions.slice(0, 5);
  const isEmpty = top.length === 0;

  return (
    <Card>
      <CardHeader
        eyebrow="Activity"
        trailing={
          <Link
            href="/accounts"
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
      {isEmpty ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0', lineHeight: 1.5 }}>
          No transactions yet. They will appear once Plaid finishes its initial pull.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top.map((t) => {
            const isInflow = t.amount < 0;
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 540,
                    }}
                  >
                    {t.merchantName ?? t.name}
                    {t.pending && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 9.5,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-faint)',
                          letterSpacing: 0.6,
                          textTransform: 'uppercase',
                        }}
                      >
                        pending
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-dim)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {formatTransactionDate(t.date)} · {labelForCategory(t.category)}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    color: isInflow ? 'var(--color-mint)' : 'var(--color-text)',
                    flexShrink: 0,
                  }}
                >
                  {isInflow ? '+' : '−'}
                  {formatCurrency(Math.abs(t.amount), {
                    currency: t.currency,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
