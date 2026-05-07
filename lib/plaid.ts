import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

function getClient(): PlaidApi {
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

  return new PlaidApi(config);
}

export const plaid = new Proxy({} as PlaidApi, {
  get(_target, prop) {
    const client = getClient();
    return (client[prop as keyof PlaidApi] as Function).bind(client);
  },
});

export { Products, CountryCode };
