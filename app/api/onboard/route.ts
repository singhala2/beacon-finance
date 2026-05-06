import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TOTAL_ONBOARDING_STEPS } from '@/lib/onboard';

const PatchSchema = z.discriminatedUnion('step', [
  z.object({
    step: z.literal(1),
    firstName: z.string().min(1).max(60),
    age: z.number().int().min(13).max(120).nullable().optional(),
    location: z.string().max(120).nullable().optional(),
  }),
  z.object({
    step: z.literal(2),
    // Plaid integration adds real fields in 1D. For now, advance only.
  }),
  z.object({
    step: z.literal(3),
  }),
  z.object({
    step: z.literal(4),
    // Goals payload lands in 1E.
  }),
  z.object({
    step: z.literal(5),
    riskTolerance: z.number().int().min(1).max(5).optional(),
  }),
  z.object({
    step: z.literal(6),
    onboardingContext: z.string().max(2000).optional(),
  }),
]);

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {
    onboardingStep: Math.max(data.step, 0),
  };

  if (data.step === 1) {
    update.firstName = data.firstName;
    if (data.age !== undefined) update.age = data.age;
    if (data.location !== undefined) update.location = data.location;
  }
  if (data.step === 5 && 'riskTolerance' in data && data.riskTolerance !== undefined) {
    update.riskTolerance = data.riskTolerance;
  }
  if (data.step === 6) {
    if ('onboardingContext' in data && data.onboardingContext !== undefined) {
      update.onboardingContext = data.onboardingContext;
    }
    update.onboardingStep = TOTAL_ONBOARDING_STEPS + 1; // mark complete
  }

  await db.user.update({
    where: { id: session.user.id },
    data: update,
  });

  return NextResponse.json({ ok: true });
}
