import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['emergency', 'house', 'retirement', 'debt', 'travel', 'custom']).optional(),
  targetAmount: z.number().positive().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  monthlyContribution: z.number().positive().nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  const goal = await db.goal.findFirst({ where: { id, userId, deletedAt: null } });
  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  return NextResponse.json({ goal });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if ('targetDate' in data) {
    data.targetDate = parsed.data.targetDate ? new Date(parsed.data.targetDate) : null;
  }

  const result = await db.goal.updateMany({
    where: { id, userId, deletedAt: null },
    data,
  });
  if (result.count === 0) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }
  await logAudit({
    userId,
    action: 'goal.update',
    targetType: 'Goal',
    targetId: id,
    metadata: parsed.data,
    req,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  const result = await db.goal.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }
  await logAudit({
    userId,
    action: 'goal.delete',
    targetType: 'Goal',
    targetId: id,
    req,
  });
  return NextResponse.json({ ok: true });
}
