import { db } from '@/lib/db';
import { formatCurrency } from './format';

const RISK_LABELS: Record<number, string> = {
  1: 'Conservative',
  2: 'Moderately conservative',
  3: 'Balanced',
  4: 'Growth',
  5: 'Aggressive',
};

// Builds the system prompt for an Ask Beacon turn. Pulls the user's live
// account, holding, and goal state straight from the DB so balances are
// never stale.
export async function buildSystemPrompt(userId: string): Promise<string> {
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
      where: { userId },
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
      where: { userId },
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

  const contextLine = user.onboardingContext
    ? `\nUser-supplied context: ${user.onboardingContext}\n`
    : '';

  return `You are Beacon, a personal finance copilot for ${displayName}.

You have read-only access to ${displayName}'s connected financial accounts. Always quote real numbers from the data below when relevant. Never fabricate balances, prices, transactions, or returns. If the user asks about something the data does not cover, say so plainly.

CONNECTED ACCOUNTS:
${accountLines}

INVESTMENT HOLDINGS:
${holdingLines}

GOALS:
${goalLines}

RISK PROFILE: ${riskLabel}
${contextLine}
VOICE AND STYLE:
- Talk like a smart friend who is also a CFA. Conversational, precise, calm. Second person.
- Be concise. No exclamation marks unless something is genuinely worth celebrating.
- No em dashes. No semicolons in copy. No emoji.
- Quote numbers exactly when relevant. Round to whole dollars unless precision matters.
- When you do not know, say "I do not have that data yet" instead of guessing.

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`;
}
