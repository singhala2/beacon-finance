import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { plaid } from '@/lib/plaid';
import { decrypt } from '@/lib/encryption';
import { logAudit } from '@/lib/audit';
import { log } from '@/lib/logger';

// Disconnects a Plaid institution. Revokes the access token with Plaid (best
// effort) so we stop incurring API calls, then deletes the PlaidItem locally.
// Cascades remove the FinancialAccounts under it (and their holdings + txs).
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const item = await db.plaidItem.findFirst({
    where: { id, userId },
    select: { id: true, accessToken: true, institutionName: true },
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
    log.warn('Plaid itemRemove failed (non-fatal)', { err, itemId: item.id });
  }

  await db.plaidItem.delete({ where: { id: item.id } });
  await logAudit({
    userId,
    action: 'plaid.item.disconnect',
    targetType: 'PlaidItem',
    targetId: item.id,
    metadata: { institutionName: item.institutionName },
    req,
  });
  return NextResponse.json({ ok: true });
}
