import { db } from '@/lib/db';
import { formatCurrency, labelForCategory } from './format';
import { buildKnowledgeContext } from '@/lib/knowledge/context';

const RISK_LABELS: Record<number, string> = {
  1: 'Conservative',
  2: 'Moderately conservative',
  3: 'Balanced',
  4: 'Growth',
  5: 'Aggressive',
};

export type UserContext = {
  displayName: string;
  riskLabel: string;
  onboardingContext: string | null;
  accountLines: string;
  holdingLines: string;
  goalLines: string;
  spendingLines: string;
  incomeLines: string;
  recentTransactionLines: string;
  // Raw aggregates other callers (insight generator) may want without re-querying:
  netWorth: number;
  cashOnHand: number;
  investable: number;
  debtTotal: number;
};

const EXCLUDED_SPEND_CATEGORIES = new Set(['TRANSFER_IN', 'TRANSFER_OUT', 'INCOME', 'LOAN_PAYMENTS']);
const INCOME_CATEGORY = 'INCOME';

// Pulls the user's live financial state and renders it as a reusable block
// of text. Used by both the chat system prompt and the insights generator.
export async function buildUserContextSnippet(userId: string): Promise<UserContext> {
  const now = new Date();
  const last30Start = new Date(now.getTime() - 30 * 86_400_000);
  const last60Start = new Date(now.getTime() - 60 * 86_400_000);

  const [user, accounts, holdings, goals, recentTxs] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        name: true,
        email: true,
        riskTolerance: true,
        onboardingContext: true,
      },
    }),
    db.financialAccount.findMany({
      where: { userId, isHidden: false },
      select: {
        id: true,
        institution: true,
        name: true,
        type: true,
        subtype: true,
        balanceCurrent: true,
        currency: true,
      },
    }),
    db.holding.findMany({
      where: { account: { userId } },
      select: { symbol: true, name: true, currentValue: true, quantity: true },
    }),
    db.goal.findMany({
      where: { userId, deletedAt: null },
      select: { name: true, type: true, targetAmount: true, targetDate: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.transaction.findMany({
      where: { userId, date: { gte: last60Start }, pending: false },
      select: {
        date: true,
        amount: true,
        name: true,
        merchantName: true,
        category: true,
        accountId: true,
      },
      orderBy: { date: 'desc' },
    }),
  ]);

  if (!user) throw new Error('User not found');

  const displayName = user.firstName ?? user.name ?? user.email.split('@')[0];

  const accountLines = accounts.length
    ? accounts.map((a) => {
        const balance = formatCurrency(a.balanceCurrent, {
          currency: a.currency,
          maximumFractionDigits: 0,
          emptyDisplay: '(unknown balance)',
        });
        return `- ${a.institution} ${a.subtype ?? a.type} "${a.name}": ${balance}`;
      }).join('\n')
    : '(none connected)';

  const holdingLines = holdings.length
    ? holdings
        .slice(0, 30)
        .map((h) => {
          const symbol = h.symbol ? `${h.symbol} ` : '';
          return `- ${symbol}${h.name}: ${h.quantity} units, ${formatCurrency(h.currentValue, { maximumFractionDigits: 0 })}`;
        })
        .join('\n')
    : '(no investment holdings)';

  const goalLines = goals.length
    ? goals.map((g) => {
        const target = g.targetAmount
          ? formatCurrency(g.targetAmount, { maximumFractionDigits: 0 })
          : 'no target set';
        const date = g.targetDate
          ? g.targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : 'no target date';
        return `- ${g.name} (${g.type}): ${target} by ${date}`;
      }).join('\n')
    : '(no goals set)';

  const riskLabel = user.riskTolerance ? RISK_LABELS[user.riskTolerance] ?? 'Unknown' : 'Not set';

  // ---- Spending / income aggregates (last 30 days vs 30 prior) ----
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  let total30Spend = 0;
  let total30Income = 0;
  let totalPriorSpend = 0;
  const spendByCategory = new Map<string, number>();
  const spendByMerchant = new Map<string, { total: number; count: number }>();
  const spendByAccount = new Map<string, number>();
  const incomeByMerchant = new Map<string, number>();

  for (const t of recentTxs) {
    const inLast30 = t.date >= last30Start;
    const cat = (t.category ?? '').toUpperCase();
    if (cat === INCOME_CATEGORY) {
      if (inLast30) {
        total30Income += -t.amount; // inflow → negative amount
        const key = t.merchantName ?? t.name;
        incomeByMerchant.set(key, (incomeByMerchant.get(key) ?? 0) + -t.amount);
      }
      continue;
    }
    if (EXCLUDED_SPEND_CATEGORIES.has(cat)) continue;
    if (t.amount <= 0) continue; // only outflows
    if (inLast30) {
      total30Spend += t.amount;
      spendByCategory.set(cat || 'OTHER', (spendByCategory.get(cat || 'OTHER') ?? 0) + t.amount);
      const merchant = t.merchantName ?? t.name;
      const cur = spendByMerchant.get(merchant) ?? { total: 0, count: 0 };
      spendByMerchant.set(merchant, { total: cur.total + t.amount, count: cur.count + 1 });
      spendByAccount.set(t.accountId, (spendByAccount.get(t.accountId) ?? 0) + t.amount);
    } else {
      totalPriorSpend += t.amount;
    }
  }

  const topCategories = [...spendByCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topMerchants = [...spendByMerchant.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  const accountSpendLines = [...spendByAccount.entries()]
    .map(([id, total]) => {
      const a = accountById.get(id);
      const label = a ? `${a.institution} ${a.name}` : id;
      return `- ${label}: ${formatCurrency(total, { maximumFractionDigits: 0 })}`;
    });

  const spendingLines = total30Spend === 0
    ? '(no spending data yet)'
    : [
        `Total (last 30d): ${formatCurrency(total30Spend, { maximumFractionDigits: 0 })}` +
          (totalPriorSpend > 0 ? ` · prior 30d: ${formatCurrency(totalPriorSpend, { maximumFractionDigits: 0 })}` : ''),
        '',
        'Top categories:',
        ...topCategories.map(([cat, total]) => `- ${labelForCategory(cat)}: ${formatCurrency(total, { maximumFractionDigits: 0 })}`),
        '',
        'Top merchants:',
        ...topMerchants.map(([m, { total, count }]) => `- ${m}: ${formatCurrency(total, { maximumFractionDigits: 0 })} across ${count} ${count === 1 ? 'charge' : 'charges'}`),
        '',
        'Spend by account:',
        ...accountSpendLines,
      ].join('\n');

  const incomeLines = total30Income === 0
    ? '(no income recorded in last 30 days)'
    : [
        `Total (last 30d): ${formatCurrency(total30Income, { maximumFractionDigits: 0 })}`,
        ...[...incomeByMerchant.entries()].map(([m, total]) => `- ${m}: ${formatCurrency(total, { maximumFractionDigits: 0 })}`),
      ].join('\n');

  const recentTransactionLines = recentTxs.length === 0
    ? '(no recent transactions)'
    : recentTxs
        .slice(0, 12)
        .map((t) => {
          const sign = t.amount >= 0 ? '-' : '+';
          const amt = formatCurrency(Math.abs(t.amount), { maximumFractionDigits: 2 });
          const date = t.date.toISOString().slice(0, 10);
          const merchant = t.merchantName ?? t.name;
          return `- ${date} ${sign}${amt} ${merchant}`;
        })
        .join('\n');

  const cashOnHand = accounts
    .filter((a) => a.type === 'depository')
    .reduce((s, a) => s + (a.balanceCurrent ?? 0), 0);
  const investable = holdings.reduce((s, h) => s + h.currentValue, 0);
  const debtTotal = accounts
    .filter((a) => a.type === 'credit' || a.type === 'loan')
    .reduce((s, a) => s + Math.abs(a.balanceCurrent ?? 0), 0);
  const netWorth =
    accounts.reduce((s, a) => {
      const bal = a.balanceCurrent ?? 0;
      if (a.type === 'credit' || a.type === 'loan') return s - Math.abs(bal);
      return s + bal;
    }, 0) + investable;

  return {
    displayName,
    riskLabel,
    onboardingContext: user.onboardingContext,
    accountLines,
    holdingLines,
    goalLines,
    spendingLines,
    incomeLines,
    recentTransactionLines,
    netWorth,
    cashOnHand,
    investable,
    debtTotal,
  };
}

// Builds the system prompt for an Ask Beacon turn.
export async function buildSystemPrompt(userId: string): Promise<string> {
  const ctx = await buildUserContextSnippet(userId);
  const contextLine = ctx.onboardingContext
    ? `\nUser-supplied context: ${ctx.onboardingContext}\n`
    : '';
  const knownFacts = await buildKnowledgeContext(userId);
  const knownFactsBlock = knownFacts ? `\n${knownFacts}\n` : '';

  return `You are Beacon, a personal finance copilot for ${ctx.displayName}.

You have read-only access to ${ctx.displayName}'s connected financial accounts. Always quote real numbers from the data below when relevant. Never fabricate balances, prices, transactions, or returns. If the user asks about something the data does not cover, say so plainly.

You can also call the search_facts tool to look up details the user has confirmed about themselves (comp, loan terms, rent, benefits) that are not shown below, and get_document to see where a fact came from. Prefer the facts you are given here; reach for the tools only when you need something not present.

CONNECTED ACCOUNTS:
${ctx.accountLines}

INVESTMENT HOLDINGS:
${ctx.holdingLines}

GOALS:
${ctx.goalLines}

RISK PROFILE: ${ctx.riskLabel}
${contextLine}${knownFactsBlock}
SPENDING (LAST 30 DAYS):
${ctx.spendingLines}

INCOME (LAST 30 DAYS):
${ctx.incomeLines}

RECENT TRANSACTIONS:
${ctx.recentTransactionLines}


VOICE AND STYLE:
- Talk like a smart friend who is also a CFA. Conversational, precise, calm. Second person.
- Be concise. No exclamation marks unless something is genuinely worth celebrating.
- No em dashes. No semicolons in copy. No emoji.
- Quote numbers exactly when relevant. Round to whole dollars unless precision matters.
- When you do not know, say "I do not have that data yet" instead of guessing.

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`;
}
