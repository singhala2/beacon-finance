import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { LayoutSchema, resolveLayout, DEFAULT_LAYOUT } from '@/lib/dashboard-layout';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { dashboardLayout: true },
  });

  return NextResponse.json({
    layout: user?.dashboardLayout ? resolveLayout(user.dashboardLayout) : DEFAULT_LAYOUT,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = LayoutSchema.safeParse(json?.layout);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid layout', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const layout = resolveLayout(parsed.data);
  await db.user.update({
    where: { id: userId },
    data: { dashboardLayout: layout },
  });

  return NextResponse.json({ ok: true, layout });
}
