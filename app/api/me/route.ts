import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const PatchSchema = z.object({
  firstName: z.string().min(1).max(60).nullable().optional(),
  name: z.string().min(1).max(120).nullable().optional(),
  age: z.number().int().min(13).max(120).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  riskTolerance: z.number().int().min(1).max(5).nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await db.user.update({ where: { id: userId }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Cascading deletes are wired at the schema level — removing the user
  // takes everything with them.
  await db.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
