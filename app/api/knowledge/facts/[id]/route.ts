// Phase 8 (8C) — confirm / edit / reject a pending fact.
// Thin wrapper over the single commit path in lib/knowledge/facts.ts.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { confirmFact, rejectFact } from '@/lib/knowledge/facts';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === 'confirm') {
    const patch = typeof body?.value === 'string' && body.value.trim() !== '' ? { value: body.value } : undefined;
    const result = await confirmFact(userId, id, patch, { req });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const result = await rejectFact(userId, id, { req });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
