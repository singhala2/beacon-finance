import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { log } from '@/lib/logger';

// SANDBOX ONLY. Resets the current user's profile + financial state so they
// can walk the onboarding flow again from step 1. Keeps identity, audit log,
// and terms acceptance. Useful for live demos when you can only sign in as
// one email (e.g., Resend free tier limits delivery to the account owner).
export async function POST(req: Request) {
  const plaidEnv = process.env.PLAID_ENV ?? 'sandbox';
  if (plaidEnv === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    // PlaidItem cascade-deletes FinancialAccount → Transaction + Holding.
    await db.plaidItem.deleteMany({ where: { userId } });
    // Conversations cascade to Messages; Insights stand alone. Wipe both so
    // there's no stale AI context from the prior data.
    await db.conversation.deleteMany({ where: { userId } });
    await db.insight.deleteMany({ where: { userId } });
    // Goals are soft-deleted in the model; hard-delete for a true reset.
    await db.goal.deleteMany({ where: { userId } });

    // Reset profile + onboarding fields but keep auth identity and terms.
    await db.user.update({
      where: { id: userId },
      data: {
        firstName: null,
        age: null,
        location: null,
        riskTolerance: null,
        onboardingStep: 0,
        onboardingContext: null,
        dashboardLayout: undefined,
        lastInsightGeneratedAt: null,
      },
    });

    await logAudit({
      userId,
      action: 'settings.profile.update',
      metadata: { source: 'restart-onboarding' },
      req,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('restart-onboarding failed', { err, userId });
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
