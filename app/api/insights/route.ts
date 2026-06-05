import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateInsightsForUser } from '@/lib/insights-ai';
import { log } from '@/lib/logger';
import { insightsGenLimit, tooManyRequests } from '@/lib/ratelimit';

const MIN_REGEN_INTERVAL_MS = 30 * 60 * 1000; // 30 min throttle for manual refresh

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const insights = await db.insight.findMany({
    where: { userId, dismissedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  return NextResponse.json({ insights });
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const rl = await insightsGenLimit.limit(userId);
  if (!rl.success) return tooManyRequests(rl);

  // Throttle so a panicky user can't blow through Anthropic credits.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lastInsightGeneratedAt: true },
  });
  if (user?.lastInsightGeneratedAt) {
    const since = Date.now() - user.lastInsightGeneratedAt.getTime();
    if (since < MIN_REGEN_INTERVAL_MS) {
      const wait = Math.ceil((MIN_REGEN_INTERVAL_MS - since) / 60_000);
      return NextResponse.json(
        { error: `Insights were just refreshed. Try again in ${wait} min.` },
        { status: 429 },
      );
    }
  }

  try {
    const result = await generateInsightsForUser(userId);
    const insights = await db.insight.findMany({
      where: { userId, dismissedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    return NextResponse.json({ ok: true, generated: result.generated, insights });
  } catch (err) {
    log.error('Insight generation failed', { err });
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
