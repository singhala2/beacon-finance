import { Card, CardHeader } from './Card';

type Bucket = 'stocks' | 'bonds' | 'cash' | 'crypto' | 'other';

type Props = {
  // raw fractions, must sum to 1 (or 0 if no holdings)
  allocation: Record<Bucket, number>;
};

const BUCKET_LABEL: Record<Bucket, string> = {
  stocks: 'Stocks',
  bonds: 'Bonds',
  cash: 'Cash',
  crypto: 'Crypto',
  other: 'Other',
};

const BUCKET_COLOR: Record<Bucket, string> = {
  stocks: 'var(--color-mint)',
  bonds: 'var(--color-indigo)',
  cash: 'var(--color-text-muted)',
  crypto: 'var(--color-warn)',
  other: 'var(--color-bg-4)',
};

const BUCKET_ORDER: Bucket[] = ['stocks', 'bonds', 'cash', 'crypto', 'other'];

export function AllocationCard({ allocation }: Props) {
  const entries = BUCKET_ORDER
    .map((b) => ({ bucket: b, value: allocation[b] }))
    .filter((e) => e.value > 0);

  const total = entries.reduce((s, e) => s + e.value, 0);
  const isEmpty = total === 0;

  // Donut geometry: stroke-based, inner radius via stroke-width.
  const size = 110;
  const cx = size / 2;
  const cy = size / 2;
  const r = 42;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <Card>
      <CardHeader eyebrow="Allocation" />
      {isEmpty ? (
        <div
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
            padding: '8px 0',
            lineHeight: 1.5,
          }}
        >
          No holdings yet. Connect a brokerage to see your allocation.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              stroke="var(--color-bg-3)"
              strokeWidth={14}
              fill="none"
            />
            {entries.map((e) => {
              const len = e.value * circumference;
              const seg = (
                <circle
                  key={e.bucket}
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={BUCKET_COLOR[e.bucket]}
                  strokeWidth={14}
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entries.map((e) => (
              <div
                key={e.bucket}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: BUCKET_COLOR[e.bucket],
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: 'var(--color-text)', flex: 1 }}>
                  {BUCKET_LABEL[e.bucket]}
                </span>
                <span style={{ color: 'var(--color-text-dim)' }}>
                  {(e.value * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
