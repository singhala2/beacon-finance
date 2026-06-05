import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { exportLimit, tooManyRequests } from '@/lib/ratelimit';

// Returns a full JSON export of the user's data. Plaid access tokens are
// excluded — those are encryption-protected internal credentials, not user
// data the user owns.
export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const rl = await exportLimit.limit(userId);
  if (!rl.success) return tooManyRequests(rl);

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      financialAccounts: {
        include: {
          holdings: true,
          transactions: { orderBy: { date: 'desc' } },
        },
      },
      goals: true,
      conversations: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
      insights: true,
      plaidItems: {
        select: {
          id: true,
          plaidItemId: true,
          institutionId: true,
          institutionName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await logAudit({ userId, action: 'data.export', req });

  const filename = `beacon-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(user, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}
