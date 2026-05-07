import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const { id } = await context.params;

  const result = await db.insight.updateMany({
    where: { id, userId, dismissedAt: null },
    data: { dismissedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
