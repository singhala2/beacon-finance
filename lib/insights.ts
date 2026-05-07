// Hardcoded insight triggers off real account / transaction / goal data.
// Real AI generation is Phase 5. The shape stays the same so we can swap.

import { formatCurrency, labelForCategory } from './format';
import type { BriefTag } from '@/components/dashboard/BriefCard';

export type Brief = {
  // Persisted insights (from DB) carry an id; hardcoded fallbacks do not.
  id?: string;
  tag: BriefTag;
  title: string;
  body: string;
  cta?: string;
  // Higher score = surface earlier
  score: number;
};

type AccountSummary = {
  type: string;
  subtype: string | null;
  balanceCurrent: number | null;
};

type TxSummary = {
  amount: number; // positive = outflow
  category: string | null;
  pending: boolean;
};

type GoalSummary = {
  name: string;
  targetAmount: number | null;
  targetDate: Date | null;
};

type Inputs = {
  accounts: AccountSummary[];
  currentMonthTxs: TxSummary[];
  priorMonthTxs: TxSummary[];
  goals: GoalSummary[];
};

const HYSA_RATE = 0.045;
const LOW_APY_THRESHOLD = 5000;
const SPEND_DELTA_THRESHOLD = 0.15; // 15% movement needed to surface

// Categories that aren't "real spend" for the purposes of cash flow framing.
const NON_SPEND = new Set(['INCOME', 'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS']);

function totalSpend(txs: TxSummary[]): number {
  return txs.reduce((sum, t) => {
    if (t.pending) return sum;
    if (t.amount <= 0) return sum;
    if (t.category && NON_SPEND.has(t.category)) return sum;
    return sum + t.amount;
  }, 0);
}

function topCategory(txs: TxSummary[]): { category: string; amount: number } | null {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.pending || t.amount <= 0) continue;
    if (t.category && NON_SPEND.has(t.category)) continue;
    const key = t.category ?? 'UNCATEGORIZED';
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  let best: { category: string; amount: number } | null = null;
  for (const [category, amount] of map) {
    if (!best || amount > best.amount) best = { category, amount };
  }
  return best;
}

function idleCashTrigger(accounts: AccountSummary[]): Brief | null {
  // Sum savings (or any depository) balances, look for low-yield idle cash.
  const savings = accounts
    .filter((a) => a.type === 'depository' && (a.subtype === 'savings' || a.subtype === 'checking'))
    .reduce((sum, a) => sum + (a.balanceCurrent ?? 0), 0);

  if (savings < LOW_APY_THRESHOLD) return null;

  const annualYield = Math.round(savings * HYSA_RATE);
  return {
    tag: 'WIN',
    title: `${formatCurrency(savings, { maximumFractionDigits: 0 })} sitting in low-yield cash`,
    body: `Moving idle cash to a high-yield savings account at around ${(HYSA_RATE * 100).toFixed(1)}% could earn roughly ${formatCurrency(annualYield, { maximumFractionDigits: 0 })} a year.`,
    cta: 'Move it',
    score: 90,
  };
}

function spendTrendTrigger(current: TxSummary[], prior: TxSummary[]): Brief | null {
  const currentTotal = totalSpend(current);
  const priorTotal = totalSpend(prior);
  if (priorTotal === 0) return null;

  const delta = (currentTotal - priorTotal) / priorTotal;
  if (Math.abs(delta) < SPEND_DELTA_THRESHOLD) return null;

  const pct = Math.round(Math.abs(delta) * 100);
  if (delta > 0) {
    const top = topCategory(current);
    return {
      tag: 'WATCH',
      title: `Spending up ${pct}% this month`,
      body: top
        ? `Mostly ${labelForCategory(top.category).toLowerCase()} (${formatCurrency(top.amount, { maximumFractionDigits: 0 })}). Want a category alert?`
        : 'Across most categories. Want a category alert?',
      cta: 'Set alert',
      score: 80,
    };
  }
  return {
    tag: 'WIN',
    title: `Spending down ${pct}% this month`,
    body: `You are running ${formatCurrency(priorTotal - currentTotal, { maximumFractionDigits: 0 })} below last month. Worth diverting that to a goal.`,
    cta: 'Allocate it',
    score: 70,
  };
}

function retirementMatchTrigger(accounts: AccountSummary[]): Brief | null {
  const has401k = accounts.some(
    (a) => a.type === 'investment' && (a.subtype === '401k' || a.subtype === '403b'),
  );
  if (!has401k) return null;
  return {
    tag: 'PLAN',
    title: 'Make sure you are capturing the full match',
    body: 'Most employers match contributions up to 4 to 6% of salary. Anything below that is leaving free money on the table.',
    cta: 'Run the numbers',
    score: 60,
  };
}

function goalProgressTrigger(goals: GoalSummary[]): Brief | null {
  const targetable = goals.find((g) => g.targetAmount && g.targetAmount > 0);
  if (!targetable) return null;

  const target = targetable.targetAmount ?? 0;
  // Until goal-to-account linkage lands in Phase 5, surface the target with a
  // contribution suggestion.
  const monthsUntil = targetable.targetDate
    ? Math.max(1, Math.round((targetable.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
    : 60;
  const monthly = Math.round(target / monthsUntil);

  return {
    tag: 'PLAN',
    title: `${formatCurrency(monthly, { maximumFractionDigits: 0 })}/mo toward ${targetable.name}`,
    body: `That contribution gets you to ${formatCurrency(target, { maximumFractionDigits: 0 })}${targetable.targetDate ? ` by ${targetable.targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}.`,
    cta: 'Set a contribution',
    score: 50,
  };
}

function debtTrigger(accounts: AccountSummary[]): Brief | null {
  const debt = accounts
    .filter((a) => a.type === 'credit')
    .reduce((sum, a) => sum + Math.abs(a.balanceCurrent ?? 0), 0);

  if (debt < 1000) return null;
  return {
    tag: 'WATCH',
    title: `${formatCurrency(debt, { maximumFractionDigits: 0 })} in revolving credit`,
    body: 'Carrying a credit balance month to month is the most expensive money you have. Knocking this down beats most other returns.',
    cta: 'Build payoff plan',
    score: 75,
  };
}

export function generateBriefs(input: Inputs): Brief[] {
  const candidates: (Brief | null)[] = [
    idleCashTrigger(input.accounts),
    spendTrendTrigger(input.currentMonthTxs, input.priorMonthTxs),
    retirementMatchTrigger(input.accounts),
    debtTrigger(input.accounts),
    goalProgressTrigger(input.goals),
  ];
  return candidates
    .filter((b): b is Brief => b !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
