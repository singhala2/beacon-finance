import type { FinancialAccount, Holding, Transaction } from '@prisma/client';

type AccountForNW = Pick<FinancialAccount, 'id' | 'type' | 'subtype' | 'balanceCurrent'>;
type HoldingForNW = Pick<Holding, 'accountId' | 'currentValue'>;
type TxForNW = Pick<Transaction, 'date' | 'amount' | 'accountId'>;

export type Composition = {
  total: number;
  debt: number;
  liquid: { total: number; cashSavings: number; rothIra: number; brokerage: number; other: number };
  illiquid: { total: number; retirement: number; alternatives: number };
};

export type HistoryPoint = { date: string; value: number };

// "Liquid" = accessible without penalty within a few business days. Brokerage,
// Roth IRA principal, and depository all qualify; 401(k) and traditional IRA
// do not (early-withdrawal penalty + tax).
function isLiquidInvestment(subtype: string | null): boolean {
  const s = (subtype ?? '').toLowerCase();
  return s === 'brokerage' || s === 'ira' || s === 'roth ira' || s === '529';
}

export function computeComposition(
  accounts: AccountForNW[],
  holdings: HoldingForNW[],
): Composition {
  // Sum holdings per account so we can route them through the account's subtype.
  const holdingsByAccount = new Map<string, number>();
  for (const h of holdings) {
    holdingsByAccount.set(h.accountId, (holdingsByAccount.get(h.accountId) ?? 0) + h.currentValue);
  }

  let cashSavings = 0;
  let rothIra = 0;
  let brokerage = 0;
  let liquidOther = 0;
  let retirement = 0;
  let alternatives = 0;
  let debt = 0;

  for (const a of accounts) {
    const bal = a.balanceCurrent ?? 0;
    if (a.type === 'depository') {
      cashSavings += bal;
    } else if (a.type === 'investment') {
      // Prefer summed holdings if we have them, fall back to account balance.
      const value = holdingsByAccount.get(a.id) ?? bal;
      const sub = (a.subtype ?? '').toLowerCase();
      if (sub === 'brokerage') brokerage += value;
      else if (sub === 'ira' || sub === 'roth ira') rothIra += value;
      else if (sub === '401k' || sub === '403b' || sub === '457b') retirement += value;
      else if (isLiquidInvestment(a.subtype)) liquidOther += value;
      else alternatives += value;
    } else if (a.type === 'credit' || a.type === 'loan') {
      debt += Math.abs(bal);
    }
  }

  const liquidTotal = cashSavings + rothIra + brokerage + liquidOther;
  const illiquidTotal = retirement + alternatives;
  const total = liquidTotal + illiquidTotal - debt;

  return {
    total,
    debt,
    liquid: { total: liquidTotal, cashSavings, rothIra, brokerage, other: liquidOther },
    illiquid: { total: illiquidTotal, retirement, alternatives },
  };
}

// Derive a daily net-worth series by walking transactions backwards from
// today's snapshot. Depository + credit changes come from transactions;
// investment value and loan principal are held flat (we don't track holding
// price history or amortization schedules in the DB).
//
// Plaid amount sign convention: positive = outflow (debit), negative = inflow.
// For depository: outflow (positive) reduces balance going forward, so going
// backward we ADD it back. Inflow (negative) reduces it going backward.
// For credit: outflow (positive) increases the balance going forward (debt
// accrues), so going backward we subtract it from debt. Same direction either
// way since debt sign-flips into the net-worth sum.
export function computeNetWorthHistory(
  accounts: AccountForNW[],
  holdings: HoldingForNW[],
  transactions: TxForNW[],
  days = 90,
): HistoryPoint[] {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Current snapshot
  const composition = computeComposition(accounts, holdings);
  const today = composition.total;

  // Map account id → contribution sign so we know how a transaction affects
  // net worth. depository: subtract amount (outflow → balance down).
  // credit:    add amount  (outflow → debt up → net worth down).
  // loan/investment: ignore (we don't model them in transactions).
  const accountSign = new Map<string, number>();
  for (const a of accounts) {
    if (a.type === 'depository') accountSign.set(a.id, -1);
    else if (a.type === 'credit') accountSign.set(a.id, -1);
  }

  // Bucket transactions by UTC date.
  const dailyDelta = new Map<string, number>();
  for (const t of transactions) {
    const sign = accountSign.get(t.accountId);
    if (sign === undefined) continue;
    const dUtc = new Date(Date.UTC(t.date.getUTCFullYear(), t.date.getUTCMonth(), t.date.getUTCDate()));
    const key = dUtc.toISOString().slice(0, 10);
    // The net effect on net worth for THIS day is sign * amount, but with
    // Plaid's outflow=positive convention, the effective delta is -amount.
    // Combined: for depository, outflow reduces NW → +amount applied with sign=-1 gives -amount delta. Good.
    const delta = sign * -t.amount;
    dailyDelta.set(key, (dailyDelta.get(key) ?? 0) + delta);
  }

  // Walk from today back N days, undoing each day's delta to get the prior-day's value.
  const points: HistoryPoint[] = [];
  let running = today;
  for (let i = 0; i < days; i++) {
    const day = new Date(todayUtc.getTime() - i * 86_400_000);
    const key = day.toISOString().slice(0, 10);
    points.push({ date: key, value: round2(running) });
    const delta = dailyDelta.get(key) ?? 0;
    running -= delta; // undo today's delta to get yesterday's starting NW
  }

  return points.reverse(); // oldest → newest
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
