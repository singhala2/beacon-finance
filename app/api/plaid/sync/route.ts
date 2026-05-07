import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncTransactionsForUser } from '@/lib/transactions';

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const result = await syncTransactionsForUser(userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('Plaid transaction sync failed:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
