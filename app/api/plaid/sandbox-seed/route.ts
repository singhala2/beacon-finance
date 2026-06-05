import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { logAudit } from '@/lib/audit';
import { log } from '@/lib/logger';
import { buildRecentGradPersona, makeDemoToken } from '@/lib/sandbox-persona';
import { plaidLimit, tooManyRequests } from '@/lib/ratelimit';

const BodySchema = z.object({
  wipeExisting: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  // Sandbox-only: refuse if Plaid env is production (this endpoint exists for
  // demos; in prod nobody should be seeding synthetic data through it).
  const plaidEnv = process.env.PLAID_ENV ?? 'sandbox';
  if (plaidEnv === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const rl = await plaidLimit.limit(userId);
  if (!rl.success) return tooManyRequests(rl);

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const { wipeExisting } = parsed.data;

  try {
    if (wipeExisting) {
      // FinancialAccount cascade-deletes onto holdings/transactions; PlaidItem
      // cascade-deletes onto FinancialAccount (added in earlier fix).
      await db.plaidItem.deleteMany({ where: { userId } });
    }

    const persona = buildRecentGradPersona();
    const encryptedToken = encrypt(makeDemoToken('recent-grad'));

    const item = await db.plaidItem.create({
      data: {
        userId,
        plaidItemId: `demo-${Date.now()}-${userId.slice(0, 6)}`,
        accessToken: encryptedToken,
        institutionId: 'beacon-demo',
        institutionName: persona.institutionName,
        status: 'active',
      },
    });

    const createdAccounts = await Promise.all(
      persona.accounts.map((a) =>
        db.financialAccount.create({
          data: {
            userId,
            plaidItemId: item.id,
            plaidAccountId: a.plaidAccountId,
            institution: a.institution,
            name: a.name,
            mask: a.mask,
            type: a.type,
            subtype: a.subtype,
            balanceCurrent: a.balanceCurrent,
            balanceAvailable: a.balanceCurrent,
            balanceLimit: a.balanceLimit ?? null,
            currency: a.currency,
            lastSyncedAt: new Date(),
          },
        }),
      ),
    );

    const idByKey = new Map(createdAccounts.map((a) => [a.plaidAccountId as string, a.id]));

    // Bulk-insert transactions
    if (persona.transactions.length > 0) {
      await db.transaction.createMany({
        data: persona.transactions
          .map((t) => {
            const accountId = idByKey.get(t.accountKey);
            if (!accountId) return null;
            return {
              userId,
              accountId,
              plaidTransactionId: t.plaidTransactionId,
              date: t.date,
              amount: t.amount,
              currency: 'USD',
              name: t.name,
              merchantName: t.merchantName ?? null,
              category: t.category ?? null,
              subcategory: t.subcategory ?? null,
              pending: false,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
      });
    }

    // Bulk-insert holdings
    if (persona.holdings.length > 0) {
      await db.holding.createMany({
        data: persona.holdings
          .map((h) => {
            const accountId = idByKey.get(h.accountKey);
            if (!accountId) return null;
            return {
              accountId,
              symbol: h.symbol,
              name: h.name,
              quantity: h.quantity,
              costBasis: h.costBasis ?? null,
              currentPrice: h.currentPrice,
              currentValue: h.currentValue,
              type: h.type,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
      });
    }

    // Bump onboarding step past bank-connect so the user doesn't get stuck.
    const userRow = await db.user.findUnique({
      where: { id: userId },
      select: { onboardingStep: true },
    });
    if (userRow && userRow.onboardingStep < 2) {
      await db.user.update({ where: { id: userId }, data: { onboardingStep: 2 } });
    }

    await logAudit({
      userId,
      action: 'plaid.item.connect',
      targetType: 'PlaidItem',
      targetId: item.id,
      metadata: { source: 'sandbox-seed', persona: 'recent-grad-v1', accountCount: createdAccounts.length },
      req,
    });

    return NextResponse.json({
      ok: true,
      accounts: createdAccounts.map((a) => ({
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
  } catch (err) {
    log.error('sandbox-seed failed', { err, userId });
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
