import { Card, CardHeader } from './Card';
import { formatCurrency } from '@/lib/format';

export type HoldingRow = {
  id: string;
  symbol: string | null;
  name: string;
  currentValue: number;
  type: string;
};

type Props = {
  holdings: HoldingRow[];
};

export function InvestmentsCard({ holdings }: Props) {
  const total = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const top = [...holdings]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 4);

  return (
    <Card>
      <CardHeader
        eyebrow="Investments"
        trailing={
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
            {holdings.length} position{holdings.length === 1 ? '' : 's'}
          </span>
        }
      />
      {holdings.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
            padding: '8px 0',
            lineHeight: 1.5,
          }}
        >
          No holdings pulled yet. Connect a brokerage in settings.
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: -0.6,
              marginBottom: 12,
              color: 'var(--color-text)',
            }}
          >
            {formatCurrency(total, { maximumFractionDigits: 0 })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {top.map((h) => {
              const share = total > 0 ? (h.currentValue / total) * 100 : 0;
              return (
                <div
                  key={h.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
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
                      {h.symbol ?? h.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-dim)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {share.toFixed(1)}%
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text)',
                      flexShrink: 0,
                    }}
                  >
                    {formatCurrency(h.currentValue, { maximumFractionDigits: 0 })}
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
