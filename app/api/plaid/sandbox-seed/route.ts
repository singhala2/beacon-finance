import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { plaid, Products } from '@/lib/plaid';
import { log } from '@/lib/logger';
import { buildRecentGradPersonaJSON } from '@/lib/sandbox-persona';
import { plaidLimit, tooManyRequests } from '@/lib/ratelimit';

// SANDBOX ONLY. Generates a Plaid Sandbox public token whose data matches the
// "recent grad" persona, then returns the token to the caller. The caller is
// expected to POST that token to /api/plaid/exchange so the normal exchange
// flow runs (item upsert, balances, holdings, transaction sync). This keeps
// the demo end-to-end Plaid: no DB bypass, real access tokens, real API calls.
//
// First Platypus Bank (ins_109508) is a sandbox institution that supports the
// products we ask for and is not OAuth-gated.
const SANDBOX_INSTITUTION_ID = 'ins_109508';

export async function POST(req: Request) {
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

  try {
    // Wipe existing items so the persona is a clean slate. Cascade-delete
    // wired in earlier fix removes the accounts/holdings/transactions.
    await db.plaidItem.deleteMany({ where: { userId } });

    const persona = buildRecentGradPersonaJSON();
    const payload = JSON.stringify(persona);

    // Sandbox-only API. The SDK types don't enumerate override_username /
    // override_password under options, so cast through. They are documented:
    // https://plaid.com/docs/sandbox/user-custom/
    const res = await plaid.sandboxPublicTokenCreate({
      institution_id: SANDBOX_INSTITUTION_ID,
      initial_products: [
        Products.Transactions,
        Products.Investments,
        Products.Liabilities,
      ],
      options: {
        override_username: 'user_custom',
        override_password: payload,
      } as unknown as Parameters<typeof plaid.sandboxPublicTokenCreate>[0]['options'],
    });

    const publicToken = res.data.public_token;
    return NextResponse.json({
      ok: true,
      publicToken,
      institutionName: 'Beacon Demo — Sandbox Bank',
      institutionId: SANDBOX_INSTITUTION_ID,
    });
  } catch (err) {
    log.error('sandbox-seed: sandbox_public_token_create failed', { err, userId });
    // Surface Plaid's error message when available for easier debugging.
    const message =
      err && typeof err === 'object' && 'response' in err
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((err as any).response?.data?.error_message ?? 'Seed failed')
        : 'Seed failed';
    return NextResponse.json({ error: String(message) }, { status: 500 });
  }
}
