import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateInsightsForUser } from '@/lib/insights-ai';
import { log } from '@/lib/logger';

const MAX_PER_INVOCATION = 100;

// Daily cron entrypoint. Generates fresh insights for every user with at
// least one connected financial account. Auth via shared CRON_SECRET so
// random internet traffic can't burn through Anthropic credits.
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization') ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await db.user.findMany({
    where: {
      onboardingStep: { gt: 6 },
      financialAccounts: { some: {} },
    },
    select: { id: true },
    take: MAX_PER_INVOCATION,
  });

  let succeeded = 0;
  let failed = 0;
  for (const u of users) {
    try {
      await generateInsightsForUser(u.id);
      succeeded++;
    } catch (err) {
      log.error('Insights generation failed', { err, userId: u.id });
      failed++;
    }
  }

  return NextResponse.json({ ok: true, processed: users.length, succeeded, failed });
}
