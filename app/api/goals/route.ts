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

const BodySchema = z.object({
  goals: z.array(GoalSchema).min(1).max(10),
});

// Replaces all goals for the user in one shot (onboarding use case).
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  await db.$transaction([
    db.goal.deleteMany({ where: { userId } }),
    db.goal.createMany({
      data: parsed.data.goals.map((g) => ({
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const goals = await db.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ goals });
}
