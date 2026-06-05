import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { buildPersonaTransactionSeeds } from '@/lib/sandbox-persona';

// Per-account brand overrides applied after exchange so each account looks
// like it lives at a real institution (not the single sandbox bank).
const BRAND_OVERRIDES: Record<string, { institution: string; name: string }> = {
  'depository:checking':   { institution: 'Chase',                     name: 'Total Checking' },
  'depository:savings':    { institution: 'Marcus by Goldman Sachs',   name: 'Online Savings' },
  'credit:credit card':    { institution: 'American Express',          name: 'Gold Card' },
  'investment:401k':       { institution: 'Fidelity',                  name: 'Workplace 401(k)' },
  'investment:ira':        { institution: 'Charles Schwab',            name: 'Roth IRA' },
  'investment:brokerage':  { institution: 'Fidelity',                  name: 'Brokerage' },
  'loan:student':          { institution: 'MOHELA',                    name: 'Federal Direct Loan' },
};

const MANUAL_PRIVATE_EQUITY = {
  institution: 'Manual',
  name: 'Tree.AI',
  type: 'investment',
  subtype: 'private equity',
  balanceCurrent: 10_000,
  currency: 'USD',
};

// SANDBOX ONLY. Called by the client immediately after /api/plaid/exchange in
// the persona-swap flow. Plaid's transactionsSync is unreliable for custom
// users (sometimes ignores the transactions we send in the user_custom
// payload, sometimes returns auto-generated ones). This endpoint overwrites
// transactions on the user's most-recent PlaidItem with the persona's exact
// spending pattern, so the dashboard/spending pages are deterministic.
export async function POST() {
  const plaidEnv = process.env.PLAID_ENV ?? 'sandbox';
  if (plaidEnv === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const item = await db.plaidItem.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { accounts: { select: { id: true, type: true, subtype: true } } },
    });
    if (!item) {
      return NextResponse.json({ error: 'No PlaidItem found' }, { status: 404 });
    }

    const accountIds = item.accounts.map((a) => a.id);
    await db.transaction.deleteMany({ where: { accountId: { in: accountIds } } });

    // Map seed → account by (type, subtype). Persona has one account per
    // (type, subtype) pair so first-match is the right account.
    const accountByKey = new Map<string, string>();
    for (const a of item.accounts) {
      accountByKey.set(`${a.type}:${a.subtype}`, a.id);
    }

    const seeds = buildPersonaTransactionSeeds();
    const rows = seeds
      .map((s) => {
        const accountId = accountByKey.get(`${s.accountType}:${s.accountSubtype}`);
        if (!accountId) return null;
        return {
          userId,
          accountId,
          plaidTransactionId: s.plaidTransactionId,
          date: s.date,
          amount: s.amount,
          currency: 'USD',
          name: s.name,
          merchantName: s.merchantName,
          category: s.category,
          subcategory: s.subcategory,
          pending: false,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length > 0) {
      await db.transaction.createMany({ data: rows, skipDuplicates: true });
    }

    // Re-brand each account so display looks like multi-institution.
    await Promise.all(
      item.accounts.map((a) => {
        const brand = BRAND_OVERRIDES[`${a.type}:${a.subtype}`];
        if (!brand) return Promise.resolve();
        return db.financialAccount.update({
          where: { id: a.id },
          data: { institution: brand.institution, name: brand.name },
        });
      }),
    );

    // Replace any prior manual accounts and create the Tree.AI angel-investment
    // account (no PlaidItem — survives Plaid disconnects).
    await db.financialAccount.deleteMany({ where: { userId, plaidItemId: null } });
    await db.financialAccount.create({
      data: {
        userId,
        plaidItemId: null,
        plaidAccountId: null,
        institution: MANUAL_PRIVATE_EQUITY.institution,
        name: MANUAL_PRIVATE_EQUITY.name,
        type: MANUAL_PRIVATE_EQUITY.type,
        subtype: MANUAL_PRIVATE_EQUITY.subtype,
        balanceCurrent: MANUAL_PRIVATE_EQUITY.balanceCurrent,
        currency: MANUAL_PRIVATE_EQUITY.currency,
      },
    });

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (err) {
    log.error('sandbox-finalize-persona failed', { err, userId });
    return NextResponse.json({ error: 'Finalize failed' }, { status: 500 });
  }
}
