// "Recent grad, further-along" persona expressed as a Plaid Sandbox
// user_custom v2 payload. The JSON returned by `buildRecentGradPersonaJSON()`
// is passed as `options.override_password` to /sandbox/public_token/create so
// the data flows through Plaid's real APIs (no DB bypass).
//
// Spec: https://plaid.com/docs/sandbox/user-custom/

type PlaidTransaction = {
  date_transacted: string;
  date_posted: string;
  amount: number;
  description: string;
  currency: 'USD';
};

type PlaidHolding = {
  institution_price: number;
  institution_price_as_of: string;
  cost_basis: number;
  quantity: number;
  currency: 'USD';
  security: { ticker_symbol: string; currency: 'USD' };
};

type PlaidAccountOverride = {
  type: 'depository' | 'credit' | 'investment' | 'loan';
  subtype: string;
  starting_balance?: number;
  currency?: 'USD';
  metadata?: { name?: string; official_name?: string; limit?: number | null; number?: string };
  transactions?: PlaidTransaction[];
  holdings?: PlaidHolding[];
  liability?: Record<string, unknown>;
  identity?: { names: string[]; emails: Array<{ primary: boolean; type: string; data: string }> };
};

export type PlaidUserCustom = {
  version: 2;
  seed: string;
  override_accounts: PlaidAccountOverride[];
};

// Persona transaction as we'll write it to the DB after exchange. Plaid's
// transactionsSync is not reliable for custom users — it sometimes returns
// auto-generated transactions or only a subset of what we sent in the
// user_custom payload. Writing this set directly into the DB after exchange
// guarantees the dashboard shows the persona's exact spending pattern.
export type PersonaTransactionSeed = {
  accountType: 'depository' | 'credit' | 'loan' | 'investment';
  accountSubtype: string;
  plaidTransactionId: string;
  date: Date;
  amount: number; // positive = outflow (Plaid convention)
  name: string;
  merchantName: string | null;
  category: string | null;
  subcategory: string | null;
};

const SEED = 'beacon-recent-grad-v2';
const DAY_MS = 86_400_000;
const TODAY = () => new Date();

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(today: Date, n: number): Date {
  return new Date(today.getTime() - n * DAY_MS);
}

function monthDay(today: Date, monthsBack: number, day: number): Date {
  return new Date(today.getUTCFullYear(), today.getUTCMonth() - monthsBack + 1, day);
}

function roundTo(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

export function buildRecentGradPersonaJSON(): PlaidUserCustom {
  const today = TODAY();
  const priceAsOf = isoDate(today);

  return {
    version: 2,
    seed: SEED,
    override_accounts: [
      // ---------- Depository: Checking ----------
      {
        type: 'depository',
        subtype: 'checking',
        starting_balance: 4_217.43,
        currency: 'USD',
        metadata: { name: 'Premier Checking', official_name: 'Premier Checking Account', number: '1234' },
        identity: {
          names: ['Alex Chen'],
          emails: [{ primary: true, type: 'primary', data: 'alex.chen@example.com' }],
        },
        transactions: checkingTransactions(today),
      },
      // ---------- Depository: HYSA ----------
      {
        type: 'depository',
        subtype: 'savings',
        starting_balance: 18_240.12,
        currency: 'USD',
        metadata: { name: 'High-Yield Savings', official_name: 'HYSA — Goal: Down Payment', number: '5678' },
        transactions: hysaTransactions(today),
      },
      // ---------- Credit card ----------
      {
        type: 'credit',
        subtype: 'credit card',
        starting_balance: 0,
        currency: 'USD',
        metadata: { name: 'Signature Cash Rewards', limit: 8_000, number: '9012' },
        liability: {
          type: 'credit',
          purchase_apr: 18.99,
          minimum_payment_amount: 25,
        },
        transactions: creditCardTransactions(today),
      },
      // ---------- Investment: 401(k) ----------
      {
        type: 'investment',
        subtype: '401k',
        starting_balance: 24_980.55,
        currency: 'USD',
        metadata: { name: 'Workplace 401(k)', number: '0001' },
        holdings: [
          {
            institution_price: 41.2,
            institution_price_as_of: priceAsOf,
            cost_basis: 17_500,
            quantity: 420.5,
            currency: 'USD',
            security: { ticker_symbol: 'VFIFX', currency: 'USD' },
          },
          {
            institution_price: 69.6,
            institution_price_as_of: priceAsOf,
            cost_basis: 6_800,
            quantity: 110.0,
            currency: 'USD',
            security: { ticker_symbol: 'SWPPX', currency: 'USD' },
          },
        ],
      },
      // ---------- Investment: Roth IRA ----------
      {
        type: 'investment',
        subtype: 'ira',
        starting_balance: 8_512.34,
        currency: 'USD',
        metadata: { name: 'Roth IRA', number: '0002' },
        holdings: [
          {
            institution_price: 281.6,
            institution_price_as_of: priceAsOf,
            cost_basis: 5_400,
            quantity: 22.5,
            currency: 'USD',
            security: { ticker_symbol: 'VTI', currency: 'USD' },
          },
          {
            institution_price: 70.2,
            institution_price_as_of: priceAsOf,
            cost_basis: 1_950,
            quantity: 31.0,
            currency: 'USD',
            security: { ticker_symbol: 'VXUS', currency: 'USD' },
          },
        ],
      },
      // ---------- Investment: Brokerage ----------
      {
        type: 'investment',
        subtype: 'brokerage',
        starting_balance: 5_211.88,
        currency: 'USD',
        metadata: { name: 'Brokerage', number: '0003' },
        holdings: [
          {
            institution_price: 281.6,
            institution_price_as_of: priceAsOf,
            cost_basis: 2_900,
            quantity: 12.0,
            currency: 'USD',
            security: { ticker_symbol: 'VTI', currency: 'USD' },
          },
          {
            institution_price: 442.0,
            institution_price_as_of: priceAsOf,
            cost_basis: 1_300,
            quantity: 3.5,
            currency: 'USD',
            security: { ticker_symbol: 'MSFT', currency: 'USD' },
          },
          {
            institution_price: 190.45,
            institution_price_as_of: priceAsOf,
            cost_basis: 290,
            quantity: 1.5,
            currency: 'USD',
            security: { ticker_symbol: 'AAPL', currency: 'USD' },
          },
        ],
      },
      // ---------- Loan: Federal Student ----------
      {
        type: 'loan',
        subtype: 'student',
        starting_balance: 12_080,
        currency: 'USD',
        metadata: { name: 'Federal Direct Loan', number: '4567' },
        liability: {
          type: 'student',
          origination_date: '2023-08-01',
          principal: 28_000,
          nominal_apr: 5.5,
          loan_name: 'Federal Direct Unsubsidized',
          repayment_model: {
            type: 'standard',
            non_repayment_months: 6,
            repayment_months: 120,
          },
        },
      },
    ],
  };
}

// ---------- transaction generators ----------

function tx(date: Date, amount: number, description: string): PlaidTransaction {
  const d = isoDate(date);
  return { date_transacted: d, date_posted: d, amount, description, currency: 'USD' };
}

function checkingTransactions(today: Date): PlaidTransaction[] {
  const out: PlaidTransaction[] = [];

  // Biweekly direct deposits ($3,650 net) over 90 days
  for (let i = 0; i < 6; i++) {
    out.push(tx(daysAgo(today, 7 + i * 14), -3_650.0, 'ACME Corp Payroll'));
  }

  // Monthly rent
  for (let m = 0; m < 3; m++) {
    out.push(tx(monthDay(today, m + 1, 1), 1_750.0, 'Maple Street Apartments — Rent'));
  }

  // Federal student loan payment
  for (let m = 0; m < 3; m++) {
    out.push(tx(monthDay(today, m + 1, 5), 260.0, 'MOHELA Federal Loan Servicing'));
  }

  // Monthly HYSA transfer out
  for (let m = 0; m < 3; m++) {
    out.push(tx(monthDay(today, m + 1, 8), 1_000.0, 'Transfer to High-Yield Savings'));
  }

  // Subscriptions / utilities — monthly
  const subs: Array<[number, string, number]> = [
    [7, 'Netflix', 15.49],
    [12, 'Spotify Family', 16.99],
    [20, 'NYT All Access', 5.0],
    [18, 'PG&E Electric', 64.32],
    [25, 'Sonic.net Internet', 75.0],
    [1, 'CrossFit Membership', 165.0],
  ];
  for (let m = 0; m < 3; m++) {
    for (const [day, desc, amt] of subs) {
      out.push(tx(monthDay(today, m + 1, day), amt, desc));
    }
  }

  // Monthly CC payoff (outflow from checking)
  const payments = [400, 720, 580];
  for (let m = 0; m < 3; m++) {
    out.push(tx(monthDay(today, m + 1, 22), payments[m] ?? 500, 'Credit Card Payment'));
  }

  return out;
}

function hysaTransactions(today: Date): PlaidTransaction[] {
  const out: PlaidTransaction[] = [];
  // Inbound transfers from checking
  for (let m = 0; m < 3; m++) {
    out.push(tx(monthDay(today, m + 1, 8), -1_000.0, 'Transfer from Checking'));
  }
  // Monthly interest credit
  for (let m = 0; m < 3; m++) {
    out.push(tx(monthDay(today, m + 1, 28), -roundTo(60 + m * 2, 2), 'Interest Earned'));
  }
  return out;
}

function creditCardTransactions(today: Date): PlaidTransaction[] {
  const out: PlaidTransaction[] = [];

  // Groceries (24)
  const grocers = ["Trader Joe's", 'Whole Foods', 'Safeway'];
  for (let i = 0; i < 24; i++) {
    const day = 4 + i * 3 + ((i * 7) % 3);
    out.push(tx(daysAgo(today, day), roundTo(38 + ((i * 13) % 70), 2), grocers[i % grocers.length]!));
  }

  // Coffee/restaurants (36)
  const eats: Array<[string, number]> = [
    ['Blue Bottle Coffee', 6.5],
    ['Sweetgreen', 14.25],
    ['Chipotle', 13.75],
    ['Tartine Bakery', 9.25],
    ['Mission Burrito', 11.5],
    ['Verve Coffee', 5.75],
    ['Souvla', 17.5],
    ['Philz Coffee', 5.5],
    ['Tacos El Patron', 12.0],
  ];
  for (let i = 0; i < 36; i++) {
    const [name, base] = eats[i % eats.length]!;
    out.push(tx(daysAgo(today, 2 + i * 2 + ((i * 3) % 4)), roundTo(base + ((i * 1.3) % 11), 2), name));
  }

  // Gas (weekly, 12)
  for (let i = 0; i < 12; i++) {
    out.push(tx(daysAgo(today, 6 + i * 7), roundTo(42 + ((i * 5) % 20), 2), 'Shell Gas Station'));
  }

  // Amazon scattered (10)
  const amazons = [27.99, 14.5, 89.0, 42.18, 18.95, 65.0, 124.5, 31.25, 9.99, 56.4];
  for (let i = 0; i < amazons.length; i++) {
    out.push(tx(daysAgo(today, 5 + i * 8), amazons[i]!, 'Amazon'));
  }

  // One-offs
  out.push(tx(daysAgo(today, 22), 145.0, 'Outside Lands Festival — Eventbrite'));
  out.push(tx(daysAgo(today, 51), 384.92, 'United Airlines — SFO to PDX'));

  // Monthly payments received (inflows clearing balance)
  const payments = [400, 720, 580];
  for (let m = 0; m < 3; m++) {
    out.push(tx(monthDay(today, m + 1, 22), -(payments[m] ?? 500), 'Payment Received — Thank You'));
  }

  return out;
}

// ---------- DB-format seeds (post-exchange override) ----------

type Seed = Omit<PersonaTransactionSeed, 'plaidTransactionId'>;

function seed(
  accountType: PersonaTransactionSeed['accountType'],
  accountSubtype: string,
  date: Date,
  amount: number,
  name: string,
  category: string | null,
  subcategory: string | null,
  merchantName: string | null = null,
): Seed {
  return { accountType, accountSubtype, date, amount, name, merchantName, category, subcategory };
}

export function buildPersonaTransactionSeeds(): PersonaTransactionSeed[] {
  const today = TODAY();
  const seeds: Seed[] = [];

  // ----- Checking -----
  for (let i = 0; i < 6; i++) {
    seeds.push(
      seed('depository', 'checking', daysAgo(today, 7 + i * 14), -3_650.0, 'ACME Corp Payroll', 'INCOME', 'INCOME_WAGES', 'ACME Corp'),
    );
  }
  for (let m = 0; m < 3; m++) {
    seeds.push(
      seed('depository', 'checking', monthDay(today, m + 1, 1), 1_750.0, 'Maple Street Apartments — Rent', 'RENT_AND_UTILITIES', 'RENT_AND_UTILITIES_RENT', 'Maple Street Apartments'),
    );
    seeds.push(
      seed('depository', 'checking', monthDay(today, m + 1, 5), 260.0, 'MOHELA Federal Loan Servicing', 'LOAN_PAYMENTS', 'LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT', 'MOHELA'),
    );
    seeds.push(
      seed('depository', 'checking', monthDay(today, m + 1, 8), 1_000.0, 'Transfer to High-Yield Savings', 'TRANSFER_OUT', 'TRANSFER_OUT_SAVINGS', 'Internal Transfer'),
    );
  }
  const subs: Array<[number, string, number, string]> = [
    [7, 'Netflix', 15.49, 'ENTERTAINMENT'],
    [12, 'Spotify Family', 16.99, 'ENTERTAINMENT'],
    [20, 'NYT All Access', 5.0, 'ENTERTAINMENT'],
    [18, 'PG&E Electric', 64.32, 'RENT_AND_UTILITIES'],
    [25, 'Sonic.net Internet', 75.0, 'RENT_AND_UTILITIES'],
    [1, 'CrossFit Membership', 165.0, 'PERSONAL_CARE'],
  ];
  for (let m = 0; m < 3; m++) {
    for (const [day, name, amt, cat] of subs) {
      seeds.push(seed('depository', 'checking', monthDay(today, m + 1, day), amt, name, cat, null, name));
    }
  }
  const ccPayments = [400, 720, 580];
  for (let m = 0; m < 3; m++) {
    seeds.push(
      seed('depository', 'checking', monthDay(today, m + 1, 22), ccPayments[m] ?? 500, 'Credit Card Payment', 'TRANSFER_OUT', 'TRANSFER_OUT_CREDIT_CARD_PAYMENT', 'Internal Transfer'),
    );
  }

  // ----- Savings -----
  for (let m = 0; m < 3; m++) {
    seeds.push(
      seed('depository', 'savings', monthDay(today, m + 1, 8), -1_000.0, 'Transfer from Checking', 'TRANSFER_IN', 'TRANSFER_IN_DEPOSIT', 'Internal Transfer'),
    );
    seeds.push(
      seed('depository', 'savings', monthDay(today, m + 1, 28), -roundTo(60 + m * 2, 2), 'Interest Earned', 'INCOME', 'INCOME_INTEREST_EARNED', null),
    );
  }

  // ----- Credit card -----
  const grocers = ["Trader Joe's", 'Whole Foods', 'Safeway'];
  for (let i = 0; i < 24; i++) {
    const day = 4 + i * 3 + ((i * 7) % 3);
    const name = grocers[i % grocers.length]!;
    seeds.push(
      seed('credit', 'credit card', daysAgo(today, day), roundTo(38 + ((i * 13) % 70), 2), name, 'FOOD_AND_DRINK', 'FOOD_AND_DRINK_GROCERIES', name),
    );
  }
  const eats: Array<[string, number]> = [
    ['Blue Bottle Coffee', 6.5],
    ['Sweetgreen', 14.25],
    ['Chipotle', 13.75],
    ['Tartine Bakery', 9.25],
    ['Mission Burrito', 11.5],
    ['Verve Coffee', 5.75],
    ['Souvla', 17.5],
    ['Philz Coffee', 5.5],
    ['Tacos El Patron', 12.0],
  ];
  for (let i = 0; i < 36; i++) {
    const [name, base] = eats[i % eats.length]!;
    seeds.push(
      seed('credit', 'credit card', daysAgo(today, 2 + i * 2 + ((i * 3) % 4)), roundTo(base + ((i * 1.3) % 11), 2), name, 'FOOD_AND_DRINK', i % 2 === 0 ? 'FOOD_AND_DRINK_COFFEE' : 'FOOD_AND_DRINK_RESTAURANT', name),
    );
  }
  for (let i = 0; i < 12; i++) {
    seeds.push(
      seed('credit', 'credit card', daysAgo(today, 6 + i * 7), roundTo(42 + ((i * 5) % 20), 2), 'Shell Gas Station', 'TRANSPORTATION', 'TRANSPORTATION_GAS', 'Shell'),
    );
  }
  const amazons = [27.99, 14.5, 89.0, 42.18, 18.95, 65.0, 124.5, 31.25, 9.99, 56.4];
  for (let i = 0; i < amazons.length; i++) {
    seeds.push(
      seed('credit', 'credit card', daysAgo(today, 5 + i * 8), amazons[i]!, 'Amazon', 'GENERAL_MERCHANDISE', 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES', 'Amazon'),
    );
  }
  seeds.push(
    seed('credit', 'credit card', daysAgo(today, 22), 145.0, 'Outside Lands Festival', 'ENTERTAINMENT', 'ENTERTAINMENT_MUSIC_AND_AUDIO', 'Eventbrite'),
  );
  seeds.push(
    seed('credit', 'credit card', daysAgo(today, 51), 384.92, 'United Airlines — SFO to PDX', 'TRAVEL', 'TRAVEL_FLIGHTS', 'United Airlines'),
  );
  for (let m = 0; m < 3; m++) {
    seeds.push(
      seed('credit', 'credit card', monthDay(today, m + 1, 22), -(ccPayments[m] ?? 500), 'Payment Received — Thank You', 'TRANSFER_IN', 'TRANSFER_IN_CREDIT_CARD_PAYMENT', null),
    );
  }

  return seeds.map((s, i) => ({
    ...s,
    plaidTransactionId: `persona:${s.accountType}:${s.accountSubtype}:${i}`.replace(/\s+/g, '_'),
  }));
}
