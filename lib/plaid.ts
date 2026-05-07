import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

let cached: PlaidApi | null = null;

function getClient(): PlaidApi {
  if (cached) return cached;

  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV ?? 'sandbox';

  if (!clientId || !secret) throw new Error('PLAID_CLIENT_ID and PLAID_SECRET must be set');

  const config = new Configuration({
    basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });

  cached = new PlaidApi(config);
  return cached;
}

// Lazy-initialized accessor. Methods call into the real client on demand so
// that env vars are validated at the first request, not at import time.
export const plaid = new Proxy({} as PlaidApi, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop as keyof PlaidApi];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export { Products, CountryCode };
