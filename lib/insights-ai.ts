import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { db } from '@/lib/db';
import { anthropic } from '@/lib/anthropic';
import { buildUserContextSnippet } from '@/lib/system-prompt';
import { formatCurrency, labelForCategory } from '@/lib/format';

// Insights are higher-stakes than chat (they get persisted and surfaced
// front-and-center), so we use Sonnet rather than Haiku here even though
// chat defaults to Haiku.
const INSIGHTS_MODEL = 'claude-sonnet-4-6';
const MAX_INSIGHTS = 3;

const VALID_TYPES = [
  'idle_cash',
  'match_gap',
  'allocation_drift',
  'fee_high',
  'goal_behind',
  'spend_spike',
  'savings_opportunity',
  'debt',
  'other',
] as const;

const VALID_SEVERITIES = ['info', 'opportunity', 'attention'] as const;

const SUBMIT_INSIGHTS_TOOL: Tool = {
  name: 'submit_insights',
  description:
    'Submit a list of personalized financial insights. Each insight calls out one specific opportunity, problem, or noteworthy fact about the user, with real numbers.',
  input_schema: {
    type: 'object',
    properties: {
      insights: {
        type: 'array',
        maxItems: MAX_INSIGHTS,
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [...VALID_TYPES],
              description:
                'Category of insight. Use "other" only when nothing else fits.',
            },
            severity: {
              type: 'string',
              enum: [...VALID_SEVERITIES],
              description:
                'opportunity = a positive action the user can take. attention = something off that should be addressed. info = neutral observation.',
            },
            headline: {
              type: 'string',
              description: 'Short title, ideally under 60 characters. No em dashes, no semicolons, no exclamation marks, no emoji.',
            },
            body: {
              type: 'string',
              description:
                'One to two sentence explanation that quotes real numbers from the user data. Same copy rules as headline.',
            },
            evidence: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metric: { type: 'string' },
                  value: { type: 'number' },
                },
                required: ['metric', 'value'],
              },
            },
          },
          required: ['type', 'severity', 'headline', 'body'],
        },
      },
    },
    required: ['insights'],
  },
};

type RawInsight = {
  type: string;
  severity: string;
  headline: string;
  body: string;
  evidence?: { metric: string; value: number }[];
};

export type GenerateResult = {
  generated: number;
};

// Pulls the user's data, asks Claude to surface up to 3 insights, validates
// the response, and persists them. Replaces existing non-dismissed insights
// for this user (dismissed ones stay so we don't re-surface what was waved
// away).
export async function generateInsightsForUser(userId: string): Promise<GenerateResult> {
  const ctx = await buildUserContextSnippet(userId);

  // Pull a richer transaction picture for the prompt: by-category spend for
  // the current and prior month so Claude can spot deltas.
  const now = new Date();
  const startCurrent = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startPrior = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const txs = await db.transaction.findMany({
    where: { userId, date: { gte: startPrior } },
    select: { amount: true, date: true, category: true, pending: true },
  });

  const byCat = new Map<string, { current: number; prior: number }>();
  let incomeCurrent = 0;
  let expensesCurrent = 0;
  for (const t of txs) {
    if (t.pending) continue;
    if (t.amount < 0 && t.date >= startCurrent) incomeCurrent += -t.amount;
    if (t.amount > 0 && t.date >= startCurrent) expensesCurrent += t.amount;
    if (t.amount > 0 && t.category) {
      const bucket = byCat.get(t.category) ?? { current: 0, prior: 0 };
      if (t.date >= startCurrent) bucket.current += t.amount;
      else bucket.prior += t.amount;
      byCat.set(t.category, bucket);
    }
  }

  const spendLines = Array.from(byCat.entries())
    .sort((a, b) => b[1].current - a[1].current)
    .slice(0, 8)
    .map(([cat, { current, prior }]) => {
      const delta = prior > 0 ? Math.round(((current - prior) / prior) * 100) : null;
      const deltaStr = delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}% vs last month)` : '';
      return `- ${labelForCategory(cat)}: ${formatCurrency(current, { maximumFractionDigits: 0 })}${deltaStr}`;
    })
    .join('\n') || '(no categorized spend yet)';

  const systemPrompt = `You are Beacon, a personal finance copilot for ${ctx.displayName}. Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

Your job right now is to surface the ${MAX_INSIGHTS} most useful insights from this user's financial picture. An insight should be specific, actionable when possible, and quote real numbers. Avoid generic advice. Avoid repeating what the user already knows.

USER FINANCIAL PICTURE
======================

CONNECTED ACCOUNTS:
${ctx.accountLines}

INVESTMENT HOLDINGS:
${ctx.holdingLines}

GOALS:
${ctx.goalLines}

RISK PROFILE: ${ctx.riskLabel}

KEY AGGREGATES:
- Net worth: ${formatCurrency(ctx.netWorth, { maximumFractionDigits: 0 })}
- Cash on hand: ${formatCurrency(ctx.cashOnHand, { maximumFractionDigits: 0 })}
- Investable assets: ${formatCurrency(ctx.investable, { maximumFractionDigits: 0 })}
- Debt total: ${formatCurrency(ctx.debtTotal, { maximumFractionDigits: 0 })}
- Income this month so far: ${formatCurrency(incomeCurrent, { maximumFractionDigits: 0 })}
- Expenses this month so far: ${formatCurrency(expensesCurrent, { maximumFractionDigits: 0 })}

SPEND BY CATEGORY (top 8, this month vs last month):
${spendLines}

VOICE AND STYLE
===============
- Conversational, precise, calm. Second person.
- No em dashes. No semicolons in copy. No exclamation marks. No emoji.
- Quote numbers exactly. Round to whole dollars.
- If a category of insight does not apply, do not force it. Better to return fewer high-quality insights.

OUTPUT
======
Call submit_insights with up to ${MAX_INSIGHTS} insights. Order them by how impactful or urgent they are, most important first.`;

  const response = await anthropic.messages.create({
    model: INSIGHTS_MODEL,
    max_tokens: 1500,
    tools: [SUBMIT_INSIGHTS_TOOL],
    tool_choice: { type: 'tool', name: 'submit_insights' },
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: 'Analyze my financial picture and submit your top insights.',
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Insights generator: model did not call the tool');
  }
  const input = toolUse.input as { insights?: RawInsight[] };
  const raw = input.insights ?? [];

  // Validate + clamp
  const validated = raw
    .filter((r) =>
      VALID_TYPES.includes(r.type as (typeof VALID_TYPES)[number]) &&
      VALID_SEVERITIES.includes(r.severity as (typeof VALID_SEVERITIES)[number]) &&
      typeof r.headline === 'string' &&
      typeof r.body === 'string',
    )
    .slice(0, MAX_INSIGHTS);

  await db.$transaction([
    // Drop any non-dismissed insights and replace with fresh ones.
    db.insight.deleteMany({ where: { userId, dismissedAt: null } }),
    db.insight.createMany({
      data: validated.map((v) => ({
        userId,
        type: v.type,
        severity: v.severity,
        headline: v.headline,
        body: v.body,
        evidence: v.evidence ?? [],
        // Action wiring lands in 5B; persist a placeholder so future renders
        // have something to map.
        actions: [{ id: 'ask', label: 'Discuss in chat' }],
      })),
    }),
    db.user.update({
      where: { id: userId },
      data: { lastInsightGeneratedAt: new Date() },
    }),
  ]);

  return { generated: validated.length };
}
