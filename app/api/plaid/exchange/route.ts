import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { AccountBase, Holding, Security } from 'plaid';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { plaid } from '@/lib/plaid';
import { encrypt } from '@/lib/encryption';
import { syncTransactionsForUser } from '@/lib/transactions';
import { logAudit } from '@/lib/audit';

const BodySchema = z.object({
  publicToken: z.string().min(1),
  institutionId: z.string().optional(),
  institutionName: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { publicToken, institutionId, institutionName } = parsed.data;

  // Exchange public token for access token
  const exchangeRes = await plaid.itemPublicTokenExchange({ public_token: publicToken });
  const { access_token, item_id } = exchangeRes.data;

  // Encrypt before persisting
  const encryptedToken = encrypt(access_token);

  // Upsert the PlaidItem
  const item = await db.plaidItem.upsert({
    where: { plaidItemId: item_id },
    create: {
      userId: session.user.id,
      plaidItemId: item_id,
      accessToken: encryptedToken,
      institutionId: institutionId ?? null,
      institutionName: institutionName ?? null,
    },
    update: {
      accessToken: encryptedToken,
      institutionName: institutionName ?? undefined,
      status: 'active',
    },
  });

  // Fetch accounts + balances
  const accountsRes = await plaid.accountsBalanceGet({ access_token });
  const plaidAccounts: AccountBase[] = accountsRes.data.accounts;

  // Fetch investment holdings (may not be available for all institutions)
  let holdings: Holding[] = [];
  let securities: Security[] = [];
  try {
    const holdingsRes = await plaid.investmentsHoldingsGet({ access_token });
    holdings = holdingsRes.data.holdings;
    securities = holdingsRes.data.securities;
  } catch {
    // Institution doesn't support investments — fine
  }

  // Upsert all accounts
  const savedAccounts = await Promise.all(
    plaidAccounts.map((a: AccountBase) =>
      db.financialAccount.upsert({
        where: { plaidAccountId: a.account_id },
        create: {
          userId: session.user.id,
          plaidItemId: item.id,
          plaidAccountId: a.account_id,
          institution: institutionName ?? 'Unknown',
          name: a.name,
          mask: a.mask ?? null,
          type: a.type,
          subtype: a.subtype ?? null,
          balanceCurrent: a.balances.current ?? null,
          balanceAvailable: a.balances.available ?? null,
          balanceLimit: a.balances.limit ?? null,
          currency: a.balances.iso_currency_code ?? 'USD',
          lastSyncedAt: new Date(),
        },
        update: {
          name: a.name,
          balanceCurrent: a.balances.current ?? null,
          balanceAvailable: a.balances.available ?? null,
          balanceLimit: a.balances.limit ?? null,
          lastSyncedAt: new Date(),
        },
      }),
    ),
  );

  // Upsert holdings for investment accounts
  if (holdings.length > 0) {
    const securityMap = new Map(securities.map((s: Security) => [s.security_id, s]));
    const accountMap = new Map(savedAccounts.map((a) => [a.plaidAccountId, a]));

    await Promise.all(
      holdings.map(async (h: Holding) => {
        const account = accountMap.get(h.account_id);
        if (!account) return;
        const security = securityMap.get(h.security_id);

        // Delete + re-insert is simpler than upsert on composite key
        await db.holding.deleteMany({ where: { accountId: account.id } });

        return db.holding.create({
          data: {
            accountId: account.id,
            securityId: h.security_id,
            symbol: security?.ticker_symbol ?? null,
            name: security?.name ?? h.security_id,
            quantity: h.quantity,
            costBasis: h.cost_basis ?? null,
            currentPrice: h.institution_price ?? null,
            currentValue: h.institution_value,
            type: mapSecurityType(security?.type ?? null),
          },
        });
      }),
    );
  }

  // Initial transaction sync so the dashboard has data on first load. Failures
  // here are non-fatal; the dashboard auto-sync will retry.
  try {
    await syncTransactionsForUser(session.user.id);
  } catch (err) {
    console.error('Initial transaction sync failed:', err);
  }

  // Advance onboarding step if still at step 1
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingStep: true },
  });
  if (user && user.onboardingStep < 2) {
    await db.user.update({
      where: { id: session.user.id },
      data: { onboardingStep: 2 },
    });
  }

  await logAudit({
    userId: session.user.id,
    action: 'plaid.item.connect',
    targetType: 'PlaidItem',
    targetId: item.id,
    metadata: { institutionName, accountCount: savedAccounts.length },
    req,
  });

  return NextResponse.json({
    ok: true,
    accounts: savedAccounts.map((a) => ({
      id: a.id,
      institution: a.institution,
      name: a.name,
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
      balanceCurrent: a.balanceCurrent,
      balanceAvailable: a.balanceAvailable,
      currency: a.currency,
    })),
  });
}

function mapSecurityType(plaidType: string | null): string {
  switch (plaidType) {
    case 'equity': return 'equity';
    case 'etf': return 'etf';
    case 'mutual fund': return 'mutual_fund';
    case 'cryptocurrency': return 'crypto';
    case 'fixed income': return 'bond';
    case 'cash': return 'cash';
    default: return 'other';
  }
}
