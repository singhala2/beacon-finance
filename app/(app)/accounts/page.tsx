import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Eyebrow } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { formatSyncedAgo } from '@/lib/dashboard';

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const accounts = await db.financialAccount.findMany({
    where: { userId: session.user.id },
    include: { item: { select: { institutionName: true } } },
    orderBy: [{ isHidden: 'asc' }, { institution: 'asc' }, { name: 'asc' }],
  });

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
          Accounts
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Every account Beacon is tracking. Click a row to rename, hide, or disconnect.
        </p>
      </div>

      {accounts.length === 0 ? (
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
          No accounts connected yet.
        </div>
      ) : (
        <div
          style={{
            background: 'var(--color-bg-2)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1.4fr 1fr 1fr 1fr',
              padding: '10px 16px',
              borderBottom: '1px solid var(--color-line)',
              gap: 12,
            }}
          >
            <Eyebrow>Institution</Eyebrow>
            <Eyebrow>Account</Eyebrow>
            <Eyebrow>Type</Eyebrow>
            <Eyebrow>Balance</Eyebrow>
            <Eyebrow>Last sync</Eyebrow>
          </div>
          {accounts.map((a) => {
            const balance = a.balanceCurrent;
            const display = a.type === 'credit' && balance !== null ? -Math.abs(balance) : balance;
            const balanceColor =
              display !== null && display < 0 ? 'var(--color-warn)' : 'var(--color-text)';
            return (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 1.4fr 1fr 1fr 1fr',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-line)',
                  gap: 12,
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: 'var(--color-text)',
                  background: 'transparent',
                  opacity: a.isHidden ? 0.5 : 1,
                  transition: 'background 0.12s',
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 540, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.institution}
                  {a.isHidden && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 9.5,
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        color: 'var(--color-text-dim)',
                      }}
                    >
                      hidden
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.customName ?? a.name}
                  {a.mask ? ` · ${a.mask}` : ''}
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  {a.subtype ?? a.type}
                </div>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: balanceColor }}>
                  {formatCurrency(display, { currency: a.currency, maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
                  {formatSyncedAgo(a.lastSyncedAt)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
