import { formatCurrency } from '@/lib/format';
import { SparkleIcon } from '@/components/ui';

type Props = {
  netWorth: number;
  accountCount: number;
  debtTotal: number;
  insightLine?: string;
};

const RANGES = ['1M', '3M', '1Y', 'All'] as const;

export function NetWorthHero({ netWorth, accountCount, debtTotal, insightLine }: Props) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, var(--color-bg-2), var(--color-bg-1))',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.6,
              color: 'var(--color-text-dim)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Net worth
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 600,
                letterSpacing: -1.4,
                lineHeight: 1,
                color: netWorth >= 0 ? 'var(--color-text)' : 'var(--color-warn)',
              }}
            >
              {formatCurrency(netWorth, { maximumFractionDigits: 0 })}
            </div>
            <div
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-dim)',
              }}
            >
              {accountCount} account{accountCount === 1 ? '' : 's'}
              {debtTotal > 0 ? ` · ${formatCurrency(debtTotal, { maximumFractionDigits: 0 })} debt` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {RANGES.map((r) => (
            <button
              key={r}
              disabled
              title="Time-range comparison arrives once we have history snapshots."
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-faint)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                cursor: 'not-allowed',
                opacity: 0.5,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Flat sparkline placeholder. Real history lands in Phase 5 polish. */}
      <div
        style={{
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-faint)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.4,
        }}
      >
        history will fill in as Beacon watches your accounts
      </div>

      {insightLine && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid var(--color-line)',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <SparkleIcon size={14} color="var(--color-indigo)" />
          <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {insightLine}
          </div>
        </div>
      )}
    </div>
  );
}
