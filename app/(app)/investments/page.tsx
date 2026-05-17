import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardHeader, CardEmptyState } from '@/components/dashboard/Card';
import { Eyebrow } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

type AllocationBucket = 'stocks' | 'bonds' | 'cash' | 'crypto' | 'other';

const BUCKET_LABEL: Record<AllocationBucket, string> = {
  stocks: 'Stocks',
  bonds: 'Bonds',
  cash: 'Cash',
  crypto: 'Crypto',
  other: 'Other',
};

const BUCKET_COLOR: Record<AllocationBucket, string> = {
  stocks: 'var(--color-mint)',
  bonds: 'var(--color-indigo)',
  cash: 'var(--color-text-muted)',
  crypto: 'var(--color-warn)',
  other: 'var(--color-bg-4)',
};

const BUCKET_ORDER: AllocationBucket[] = ['stocks', 'bonds', 'cash', 'crypto', 'other'];

function bucketForHoldingType(type: string): AllocationBucket {
  switch (type) {
    case 'equity':
    case 'etf':
    case 'mutual_fund':
      return 'stocks';
    case 'bond':
      return 'bonds';
    case 'cash':
      return 'cash';
    case 'crypto':
      return 'crypto';
    default:
      return 'other';
  }
}

export default async function InvestmentsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const holdings = await db.holding.findMany({
    where: { account: { userId } },
    include: {
      account: { select: { id: true, institution: true, name: true, mask: true, subtype: true } },
    },
    orderBy: { currentValue: 'desc' },
  });

  const total = holdings.reduce((sum, h) => sum + h.currentValue, 0);

  // Allocation aggregate
  const allocationRaw: Record<AllocationBucket, number> = {
    stocks: 0, bonds: 0, cash: 0, crypto: 0, other: 0,
  };
  for (const h of holdings) {
    allocationRaw[bucketForHoldingType(h.type)] += h.currentValue;
  }
  const allocationEntries = BUCKET_ORDER
    .map((b) => ({ bucket: b, value: allocationRaw[b], fraction: total > 0 ? allocationRaw[b] / total : 0 }))
    .filter((e) => e.value > 0);

  // Group holdings by account
  const accountGroups = new Map<
    string,
    { institution: string; subtype: string | null; mask: string | null; name: string; holdings: typeof holdings }
  >();
  for (const h of holdings) {
    const key = h.account.id;
    if (!accountGroups.has(key)) {
      accountGroups.set(key, {
        institution: h.account.institution,
        subtype: h.account.subtype,
        mask: h.account.mask,
        name: h.account.name,
        holdings: [],
      });
    }
    accountGroups.get(key)!.holdings.push(h);
  }
  const groups = Array.from(accountGroups.entries()).map(([id, g]) => ({
    id,
    ...g,
    accountValue: g.holdings.reduce((s, h) => s + h.currentValue, 0),
  }));
  groups.sort((a, b) => b.accountValue - a.accountValue);

  // Donut geometry
  const size = 130;
  const cx = size / 2;
  const cy = size / 2;
  const r = 50;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const topHolding = holdings[0];
  const topShare = topHolding && total > 0 ? (topHolding.currentValue / total) * 100 : 0;

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
          Investments
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Every position Beacon is tracking, what they add up to, and where they sit.
        </p>
      </div>

      {holdings.length === 0 ? (
        <Card>
          <CardEmptyState>
            No investment holdings pulled yet. Connect a brokerage from the dashboard or settings.
          </CardEmptyState>
        </Card>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <Card>
              <Eyebrow style={{ marginBottom: 6 }}>Total value</Eyebrow>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>
                {formatCurrency(total, { maximumFractionDigits: 0 })}
              </div>
            </Card>
            <Card>
              <Eyebrow style={{ marginBottom: 6 }}>Positions</Eyebrow>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>
                {holdings.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                across {groups.length} account{groups.length === 1 ? '' : 's'}
              </div>
            </Card>
            <Card>
              <Eyebrow style={{ marginBottom: 6 }}>Top holding</Eyebrow>
              {topHolding ? (
                <>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    {topHolding.symbol ?? topHolding.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {topShare.toFixed(1)}% of portfolio · {formatCurrency(topHolding.currentValue, { maximumFractionDigits: 0 })}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>None</div>
              )}
            </Card>
          </div>

          {/* Allocation */}
          <div style={{ marginBottom: 16 }}>
            <Card>
              <CardHeader eyebrow="Allocation" />
              {allocationEntries.length === 0 ? (
                <CardEmptyState>No allocation data yet.</CardEmptyState>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      stroke="var(--color-bg-3)"
                      strokeWidth={16}
                      fill="none"
                    />
                    {allocationEntries.map((e) => {
                      const len = e.fraction * circumference;
                      const seg = (
                        <circle
                          key={e.bucket}
                          cx={cx}
                          cy={cy}
                          r={r}
                          stroke={BUCKET_COLOR[e.bucket]}
                          strokeWidth={16}
                          fill="none"
                          strokeDasharray={`${len} ${circumference - len}`}
                          strokeDashoffset={-offset}
                          transform={`rotate(-90 ${cx} ${cy})`}
                        />
                      );
                      offset += len;
                      return seg;
                    })}
                  </svg>
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {allocationEntries.map((e) => (
                      <div
                        key={e.bucket}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 13,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            background: BUCKET_COLOR[e.bucket],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: 'var(--color-text)', flex: 1 }}>
                          {BUCKET_LABEL[e.bucket]}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {(e.fraction * 100).toFixed(0)}%
                        </span>
                        <span
                          style={{
                            color: 'var(--color-text-dim)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            minWidth: 80,
                            textAlign: 'right',
                          }}
                        >
                          {formatCurrency(e.value, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Holdings grouped by account */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((g) => (
              <Card key={g.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--color-line)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      {g.institution}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-dim)',
                        marginTop: 2,
                      }}
                    >
                      {g.subtype ?? 'investment'}
                      {g.mask ? ` · ${g.mask}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(g.accountValue, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1.4fr 1fr 1fr 60px',
                    gap: 10,
                    paddingBottom: 8,
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-dim)',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  <div>Symbol</div>
                  <div>Name</div>
                  <div style={{ textAlign: 'right' }}>Qty</div>
                  <div style={{ textAlign: 'right' }}>Value</div>
                  <div style={{ textAlign: 'right' }}>%</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {g.holdings.map((h) => {
                    const share = total > 0 ? (h.currentValue / total) * 100 : 0;
                    return (
                      <div
                        key={h.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '90px 1.4fr 1fr 1fr 60px',
                          gap: 10,
                          padding: '8px 0',
                          fontSize: 13,
                          alignItems: 'center',
                          borderTop: '1px solid var(--color-line)',
                        }}
                      >
                        <div
                          title={h.symbol ?? undefined}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: 0,
                          }}
                        >
                          {h.symbol ?? '—'}
                        </div>
                        <div
                          title={h.name}
                          style={{
                            color: 'var(--color-text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: 0,
                          }}
                        >
                          {h.name}
                        </div>
                        <div
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {h.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(h.currentValue, { maximumFractionDigits: 0 })}
                        </div>
                        <div
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-text-dim)',
                          }}
                        >
                          {share.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
