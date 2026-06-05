import { HeroShell } from './HeroShell';
import { HeroNetWorth } from './HeroNetWorth';
import { formatCurrency } from '@/lib/format';
import type { HeroId } from '@/lib/dashboard-layout';
import type { Composition, HistoryPoint } from '@/lib/networth';

export type HeroData = {
  netWorth: number;
  cash: number;
  investable: number;
  debt: number;
  monthlyCashFlow: number;
  accountCount: number;
  monthLabel: string;
  insightLine?: string;
  composition: Composition;
  history: HistoryPoint[];
};

type Props = {
  variant: HeroId;
  data: HeroData;
  editing?: boolean;
  onClick?: () => void;
};

const fmt = (n: number) => formatCurrency(n, { maximumFractionDigits: 0 });
const signed = (n: number) => (n >= 0 ? `+${fmt(n)}` : fmt(n));

export function Hero({ variant, data, editing, onClick }: Props) {
  switch (variant) {
    case 'networth':
      return (
        <HeroNetWorth
          netWorth={data.netWorth}
          debt={data.debt}
          accountCount={data.accountCount}
          composition={data.composition}
          history={data.history}
          insightLine={data.insightLine}
          editing={editing}
          onClick={onClick}
        />
      );
    case 'cash':
      return (
        <HeroShell
          eyebrow="Cash on hand"
          value={fmt(data.cash)}
          subline={`liquid in checking and savings`}
          editing={editing}
          onClick={onClick}
        />
      );
    case 'investable':
      return (
        <HeroShell
          eyebrow="Investable assets"
          value={fmt(data.investable)}
          subline={`brokerage, retirement, and crypto holdings`}
          editing={editing}
          onClick={onClick}
        />
      );
    case 'debt':
      return (
        <HeroShell
          eyebrow="Debt total"
          value={fmt(data.debt)}
          valueColor={data.debt > 0 ? 'var(--color-warn)' : 'var(--color-text)'}
          subline={`across credit cards and lines of credit`}
          editing={editing}
          onClick={onClick}
        />
      );
    case 'cashflow':
      return (
        <HeroShell
          eyebrow={`${data.monthLabel} cash flow`}
          value={signed(data.monthlyCashFlow)}
          valueColor={data.monthlyCashFlow >= 0 ? 'var(--color-mint)' : 'var(--color-warn)'}
          subline={`income minus expenses, month to date`}
          editing={editing}
          onClick={onClick}
        />
      );
  }
}
