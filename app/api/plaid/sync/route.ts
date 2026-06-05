import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncTransactionsForUser } from '@/lib/transactions';
import { logAudit } from '@/lib/audit';
import { log } from '@/lib/logger';
import { plaidLimit, tooManyRequests } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const rl = await plaidLimit.limit(userId);
  if (!rl.success) return tooManyRequests(rl);

  try {
    const result = await syncTransactionsForUser(userId);
    await logAudit({
      userId,
      action: 'plaid.sync',
      metadata: result as unknown as Record<string, unknown>,
      req,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    log.error('Plaid transaction sync failed', { err, userId });
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
