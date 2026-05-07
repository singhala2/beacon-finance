import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const GoalSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['emergency', 'house', 'retirement', 'debt', 'travel', 'custom']),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().datetime().optional(),
  monthlyContribution: z.number().positive().optional(),
});

const ReplaceBodySchema = z.object({
  goals: z.array(GoalSchema).min(1).max(10),
});

// Two POST shapes:
//   { goals: [...] }       — replace-all (onboarding)
//   { goal: {...} }        — single create (post-onboarding from /goals)
const SingleBodySchema = z.object({ goal: GoalSchema });

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);

  const single = SingleBodySchema.safeParse(json);
  if (single.success) {
    const g = single.data.goal;
    const created = await db.goal.create({
      data: {
        userId,
        name: g.name,
        type: g.type,
        targetAmount: g.targetAmount ?? null,
        targetDate: g.targetDate ? new Date(g.targetDate) : null,
        monthlyContribution: g.monthlyContribution ?? null,
      },
    });
    return NextResponse.json({ ok: true, goal: created });
  }

  const replace = ReplaceBodySchema.safeParse(json);
  if (replace.success) {
    await db.$transaction([
      db.goal.deleteMany({ where: { userId } }),
      db.goal.createMany({
        data: replace.data.goals.map((g) => ({
          userId,
          name: g.name,
          type: g.type,
          targetAmount: g.targetAmount ?? null,
          targetDate: g.targetDate ? new Date(g.targetDate) : null,
          monthlyContribution: g.monthlyContribution ?? null,
        })),
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const goals = await db.goal.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ goals });
}
