// Phase 8 (8F) — manual fact entry. The user adds a fact directly; it flows
// through the same commit path as document and chat facts and lands pending for
// confirmation. No new truth path.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { commitFacts } from '@/lib/knowledge/facts';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const domain = typeof body?.domain === 'string' ? body.domain : '';
  const key = typeof body?.key === 'string' ? body.key : '';
  const value = body?.value;

  if (!domain || !key || value === undefined || value === null || value === '') {
    return NextResponse.json({ error: 'Provide a domain, a fact, and a value.' }, { status: 400 });
  }

  const result = await commitFacts(userId, [{ domain, key, value, source: 'manual' }], { req });
  if (result.committed === 0) {
    return NextResponse.json({ error: result.rejected[0]?.error ?? 'That value did not validate.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, committed: result.committed });
}
