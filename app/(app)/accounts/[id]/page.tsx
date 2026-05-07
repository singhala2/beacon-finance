import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardHeader } from '@/components/dashboard/Card';
import { Eyebrow } from '@/components/ui';
import { formatCurrency, formatTransactionDate, labelForCategory } from '@/lib/format';
import { AccountControls } from '@/components/accounts/AccountControls';

const TRANSACTION_LIMIT = 30;

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const account = await db.financialAccount.findFirst({
    where: { id, userId: session.user.id },
    include: { item: { select: { id: true, institutionName: true } } },
  });
  if (!account) notFound();

  const transactions = await db.transaction.findMany({
    where: { accountId: account.id },
    orderBy: { date: 'desc' },
    take: TRANSACTION_LIMIT,
  });

  const balance = account.balanceCurrent;
  const display = account.type === 'credit' && balance !== null ? -Math.abs(balance) : balance;
  const balanceColor = display !== null && display < 0 ? 'var(--color-warn)' : 'var(--color-text)';

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ marginBottom: 18 }}>
        <Link
          href="/accounts"
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-dim)',
            textDecoration: 'none',
          }}
        >
          ← Accounts
        </Link>
        <h1
          style={{
            marginTop: 8,
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: -0.6,
            margin: '8px 0 4px',
            lineHeight: 1.1,
          }}
        >
          {account.customName ?? account.name}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          {account.institution} · {account.subtype ?? account.type}
          {account.mask ? ` · ${account.mask}` : ''}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <Card>
          <Eyebrow style={{ marginBottom: 6 }}>Current balance</Eyebrow>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: balanceColor }}>
            {formatCurrency(display, { currency: account.currency, maximumFractionDigits: 0 })}
          </div>
          {account.balanceAvailable !== null && account.balanceAvailable !== balance && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
              {formatCurrency(account.balanceAvailable, { currency: account.currency, maximumFractionDigits: 0 })} available
            </div>
          )}
        </Card>
        <Card>
          <Eyebrow style={{ marginBottom: 6 }}>Status</Eyebrow>
          <div style={{ fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>
            Last synced {account.lastSyncedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          {account.isHidden && (
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
              Hidden from dashboard sums.
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginBottom: 22 }}>
        <Card>
          <CardHeader
            eyebrow="Recent activity"
            trailing={
              <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                last {transactions.length}
              </span>
            }
          />
          {transactions.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0' }}>
              No transactions for this account yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map((t) => {
                const isInflow = t.amount < 0;
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--color-text)',
                          fontWeight: 540,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.merchantName ?? t.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
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
                      {formatCurrency(Math.abs(t.amount), { currency: t.currency, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader eyebrow="Manage" />
        <AccountControls
          accountId={account.id}
          plaidItemId={account.item?.id ?? null}
          initialName={account.customName ?? account.name}
          initialHidden={account.isHidden}
          institutionName={account.item?.institutionName ?? account.institution}
        />
      </Card>
    </div>
  );
}
