import type { Transaction as PlaidTransaction, RemovedTransaction } from 'plaid';
import { db } from '@/lib/db';
import { plaid } from '@/lib/plaid';
import { decrypt } from '@/lib/encryption';

type SyncResult = {
  added: number;
  modified: number;
  removed: number;
};

// Pulls transactions for every active PlaidItem owned by the user, using the
// per-item cursor for incremental updates. Stores the new cursor so subsequent
// calls only return what's changed.
export async function syncTransactionsForUser(userId: string): Promise<SyncResult> {
  const items = await db.plaidItem.findMany({
    where: { userId, status: 'active' },
    include: { accounts: true },
  });

  let added = 0;
  let modified = 0;
  let removed = 0;

  for (const item of items) {
    const accessToken = decrypt(item.accessToken);
    const accountByPlaidId = new Map(
      item.accounts
        .filter((a) => a.plaidAccountId !== null)
        .map((a) => [a.plaidAccountId as string, a]),
    );

    let cursor = item.cursor ?? '';
    let hasMore = true;

    while (hasMore) {
      const res = await plaid.transactionsSync({
        access_token: accessToken,
        cursor: cursor || undefined,
      });
      const data = res.data;

      for (const t of data.added) {
        const account = accountByPlaidId.get(t.account_id);
        if (!account) continue;
        await upsertTransaction(userId, account.id, t);
        added++;
      }

      for (const t of data.modified) {
        const account = accountByPlaidId.get(t.account_id);
        if (!account) continue;
        await upsertTransaction(userId, account.id, t);
        modified++;
      }

      for (const t of data.removed as RemovedTransaction[]) {
        if (!t.transaction_id) continue;
        const result = await db.transaction.deleteMany({
          where: { plaidTransactionId: t.transaction_id },
        });
        removed += result.count;
      }

      cursor = data.next_cursor;
      hasMore = data.has_more;
    }

    await db.plaidItem.update({
      where: { id: item.id },
      data: { cursor },
    });
  }

  return { added, modified, removed };
}

async function upsertTransaction(
  userId: string,
  accountId: string,
  t: PlaidTransaction,
): Promise<void> {
  const data = {
    date: new Date(t.date),
    amount: t.amount,
    currency: t.iso_currency_code ?? 'USD',
    name: t.name,
    merchantName: t.merchant_name ?? null,
    category: t.personal_finance_category?.primary ?? t.category?.[0] ?? null,
    subcategory: t.personal_finance_category?.detailed ?? t.category?.[1] ?? null,
    pending: t.pending,
  };

  await db.transaction.upsert({
    where: { plaidTransactionId: t.transaction_id },
    create: {
      userId,
      accountId,
      plaidTransactionId: t.transaction_id,
      ...data,
    },
    update: data,
  });
}
