import { db } from '@/lib/db';
import { formatCurrency } from './format';

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
  // Raw aggregates other callers (insight generator) may want without re-querying:
  netWorth: number;
  cashOnHand: number;
  investable: number;
  debtTotal: number;
};

// Pulls the user's live financial state and renders it as a reusable block
// of text. Used by both the chat system prompt and the insights generator.
export async function buildUserContextSnippet(userId: string): Promise<UserContext> {
  const [user, accounts, holdings, goals] = await Promise.all([
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

  return `You are Beacon, a personal finance copilot for ${ctx.displayName}.

You have read-only access to ${ctx.displayName}'s connected financial accounts. Always quote real numbers from the data below when relevant. Never fabricate balances, prices, transactions, or returns. If the user asks about something the data does not cover, say so plainly.

CONNECTED ACCOUNTS:
${ctx.accountLines}

INVESTMENT HOLDINGS:
${ctx.holdingLines}

GOALS:
${ctx.goalLines}

RISK PROFILE: ${ctx.riskLabel}
${contextLine}
VOICE AND STYLE:
- Talk like a smart friend who is also a CFA. Conversational, precise, calm. Second person.
- Be concise. No exclamation marks unless something is genuinely worth celebrating.
- No em dashes. No semicolons in copy. No emoji.
- Quote numbers exactly when relevant. Round to whole dollars unless precision matters.
- When you do not know, say "I do not have that data yet" instead of guessing.

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`;
}
