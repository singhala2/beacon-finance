import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const PatchSchema = z.object({
  customName: z.string().min(1).max(100).nullable().optional(),
  isHidden: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const result = await db.financialAccount.updateMany({
    where: { id, userId },
    data: parsed.data,
  });
  if (result.count === 0) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }
  await logAudit({
    userId,
    action: 'account.update',
    targetType: 'FinancialAccount',
    targetId: id,
    metadata: parsed.data,
    req,
  });
  return NextResponse.json({ ok: true });
}
