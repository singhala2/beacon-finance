import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { plaid } from '@/lib/plaid';
import { decrypt } from '@/lib/encryption';

// Disconnects a Plaid institution. Revokes the access token with Plaid (best
// effort) so we stop incurring API calls, then deletes the PlaidItem locally.
// Cascades remove the FinancialAccounts under it (and their holdings + txs).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const item = await db.plaidItem.findFirst({
    where: { id, userId },
    select: { id: true, accessToken: true },
  });
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Revoke with Plaid first; failure is non-fatal since the row is going away
  // anyway and the access token is encrypted at rest.
  try {
    const accessToken = decrypt(item.accessToken);
    await plaid.itemRemove({ access_token: accessToken });
  } catch (err) {
    console.error('Plaid itemRemove failed (non-fatal):', err);
  }

  await db.plaidItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
