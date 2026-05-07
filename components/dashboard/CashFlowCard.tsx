import { Card, CardHeader } from './Card';
import { formatCurrency } from '@/lib/format';

type Period = { income: number; expenses: number; net: number };

type Props = {
  current: Period;
  prior: Period;
  monthLabel: string; // e.g. "May"
};

function deltaColor(curr: number, prev: number, betterWhenHigher = true): string {
  if (curr === prev) return 'var(--color-text-dim)';
  const better = betterWhenHigher ? curr > prev : curr < prev;
  return better ? 'var(--color-mint)' : 'var(--color-warn)';
}

export function CashFlowCard({ current, prior, monthLabel }: Props) {
  const isEmpty = current.income === 0 && current.expenses === 0;
  const netColor = current.net >= 0 ? 'var(--color-mint)' : 'var(--color-warn)';

  const incomeDelta = current.income - prior.income;
  const expenseDelta = current.expenses - prior.expenses;

  return (
    <Card>
      <CardHeader
        eyebrow="Cash flow"
        trailing={
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
            {monthLabel} so far
          </span>
        }
      />
      {isEmpty ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0', lineHeight: 1.5 }}>
          No transactions yet. Once Plaid finishes pulling, the picture will fill in.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6, marginBottom: 12, color: netColor }}>
            {current.net >= 0 ? '+' : ''}
            {formatCurrency(current.net, { maximumFractionDigits: 0 })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row
              label="In"
              value={current.income}
              delta={incomeDelta}
              deltaColor={deltaColor(current.income, prior.income, true)}
            />
            <Row
              label="Out"
              value={current.expenses}
              delta={expenseDelta}
              deltaColor={deltaColor(current.expenses, prior.expenses, false)}
            />
          </div>
        </>
      )}
    </Card>
  );
}

function Row({
  label,
  value,
  delta,
  deltaColor: dColor,
}: {
  label: string;
  value: number;
  delta: number;
  deltaColor: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span
        style={{
          width: 28,
          fontSize: 11,
          color: 'var(--color-text-dim)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
        {formatCurrency(value, { maximumFractionDigits: 0 })}
      </span>
      {delta !== 0 && (
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: dColor }}>
          {delta > 0 ? '+' : ''}
          {formatCurrency(delta, { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}
