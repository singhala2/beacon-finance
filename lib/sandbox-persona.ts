// Synthetic "recent grad, further-along" persona used by /api/plaid/sandbox-seed
// to populate a believable financial picture without going through Plaid Link.
// PlaidItems created from this persona carry an access token of the form
// `DEMO_PERSONA:<key>` so the sync path can skip them — see lib/transactions.ts.

const TODAY = () => new Date(); // computed at request time so dates feel fresh
const DAY = 86_400_000;
const DEMO_TOKEN_PREFIX = 'DEMO_PERSONA';

export function makeDemoToken(personaKey: string): string {
  return `${DEMO_TOKEN_PREFIX}:${personaKey}:${Date.now()}`;
}

export function isDemoToken(decrypted: string): boolean {
  return decrypted.startsWith(`${DEMO_TOKEN_PREFIX}:`);
}

export type PersonaAccount = {
  plaidAccountId: string;
  institution: string;
  name: string;
  mask: string;
  type: string; // depository | credit | investment | loan
  subtype: string;
  balanceCurrent: number; // For loans/credit, store NEGATIVE to represent debt.
  balanceLimit?: number | null;
  currency: string;
};

export type PersonaTransaction = {
  plaidTransactionId: string;
  accountKey: string; // ties to PersonaAccount.plaidAccountId
  date: Date;
  amount: number; // positive = outflow (Plaid convention)
  name: string;
  merchantName?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

export type PersonaHolding = {
  accountKey: string;
  symbol: string;
  name: string;
  quantity: number;
  costBasis?: number | null;
  currentPrice: number;
  currentValue: number;
  type: string; // equity | etf | mutual_fund | crypto | bond | cash | other
};

export type PersonaDataset = {
  institutionName: string;
  accounts: PersonaAccount[];
  transactions: PersonaTransaction[];
  holdings: PersonaHolding[];
};

const RECENT_GRAD_KEY = 'recent-grad-v1';

export function buildRecentGradPersona(): PersonaDataset {
  const today = TODAY();
  const accounts: PersonaAccount[] = [
    {
      plaidAccountId: `${RECENT_GRAD_KEY}:checking`,
      institution: 'Beacon Sandbox Bank',
      name: 'Premier Checking',
      mask: '1234',
      type: 'depository',
      subtype: 'checking',
      balanceCurrent: 4_217.43,
      currency: 'USD',
    },
    {
      plaidAccountId: `${RECENT_GRAD_KEY}:savings`,
      institution: 'Beacon Sandbox Bank',
      name: 'High-Yield Savings',
      mask: '5678',
      type: 'depository',
      subtype: 'savings',
      balanceCurrent: 18_240.12,
      currency: 'USD',
    },
    {
      plaidAccountId: `${RECENT_GRAD_KEY}:cc`,
      institution: 'Beacon Sandbox Bank',
      name: 'Signature Cash Rewards',
      mask: '9012',
      type: 'credit',
      subtype: 'credit card',
      balanceCurrent: 0, // paid in full
      balanceLimit: 8_000,
      currency: 'USD',
    },
    {
      plaidAccountId: `${RECENT_GRAD_KEY}:401k`,
      institution: 'Beacon Sandbox Bank',
      name: 'Workplace 401(k)',
      mask: '0001',
      type: 'investment',
      subtype: '401k',
      balanceCurrent: 24_980.55,
      currency: 'USD',
    },
    {
      plaidAccountId: `${RECENT_GRAD_KEY}:roth`,
      institution: 'Beacon Sandbox Bank',
      name: 'Roth IRA',
      mask: '0002',
      type: 'investment',
      subtype: 'ira',
      balanceCurrent: 8_512.34,
      currency: 'USD',
    },
    {
      plaidAccountId: `${RECENT_GRAD_KEY}:brokerage`,
      institution: 'Beacon Sandbox Bank',
      name: 'Brokerage',
      mask: '0003',
      type: 'investment',
      subtype: 'brokerage',
      balanceCurrent: 5_211.88,
      currency: 'USD',
    },
    {
      plaidAccountId: `${RECENT_GRAD_KEY}:fed-loan`,
      institution: 'Beacon Sandbox Bank',
      name: 'Federal Direct Loan',
      mask: '4567',
      type: 'loan',
      subtype: 'student',
      balanceCurrent: -12_080.0, // negative = outstanding debt
      currency: 'USD',
    },
  ];

  const holdings: PersonaHolding[] = [
    // 401(k)
    {
      accountKey: `${RECENT_GRAD_KEY}:401k`,
      symbol: 'VFIFX',
      name: 'Vanguard Target Retirement 2065',
      quantity: 420.5,
      costBasis: 17_500,
      currentPrice: 41.2,
      currentValue: 17_324.6,
      type: 'mutual_fund',
    },
    {
      accountKey: `${RECENT_GRAD_KEY}:401k`,
      symbol: 'SWPPX',
      name: 'Schwab S&P 500 Index',
      quantity: 110.0,
      costBasis: 6_800,
      currentPrice: 69.6,
      currentValue: 7_655.95,
      type: 'mutual_fund',
    },
    // Roth IRA
    {
      accountKey: `${RECENT_GRAD_KEY}:roth`,
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      quantity: 22.5,
      costBasis: 5_400,
      currentPrice: 281.6,
      currentValue: 6_336.0,
      type: 'etf',
    },
    {
      accountKey: `${RECENT_GRAD_KEY}:roth`,
      symbol: 'VXUS',
      name: 'Vanguard Total International Stock ETF',
      quantity: 31.0,
      costBasis: 1_950,
      currentPrice: 70.2,
      currentValue: 2_176.34,
      type: 'etf',
    },
    // Brokerage
    {
      accountKey: `${RECENT_GRAD_KEY}:brokerage`,
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      quantity: 12.0,
      costBasis: 2_900,
      currentPrice: 281.6,
      currentValue: 3_379.2,
      type: 'etf',
    },
    {
      accountKey: `${RECENT_GRAD_KEY}:brokerage`,
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      quantity: 3.5,
      costBasis: 1_300,
      currentPrice: 442.0,
      currentValue: 1_547.0,
      type: 'equity',
    },
    {
      accountKey: `${RECENT_GRAD_KEY}:brokerage`,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 1.5,
      costBasis: 290,
      currentPrice: 190.45,
      currentValue: 285.68,
      type: 'equity',
    },
  ];

  const transactions: PersonaTransaction[] = generateTransactions(today);

  return {
    institutionName: 'Beacon Sandbox Bank',
    accounts,
    transactions,
    holdings,
  };
}

// ---------- transaction generator ----------

function daysAgo(today: Date, n: number): Date {
  return new Date(today.getTime() - n * DAY);
}

function txId(idx: number): string {
  return `${RECENT_GRAD_KEY}:tx:${idx}`;
}

function generateTransactions(today: Date): PersonaTransaction[] {
  const out: PersonaTransaction[] = [];
  let idx = 0;
  const checking = `${RECENT_GRAD_KEY}:checking`;
  const savings = `${RECENT_GRAD_KEY}:savings`;
  const cc = `${RECENT_GRAD_KEY}:cc`;

  // Biweekly direct deposits ($3,650 net) — last 6 paydays, Fridays-ish.
  for (let i = 0; i < 6; i++) {
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: checking,
      date: daysAgo(today, 7 + i * 14),
      amount: -3_650.0, // negative = inflow (deposit)
      name: 'ACME Corp Payroll',
      merchantName: 'ACME Corp',
      category: 'INCOME',
      subcategory: 'INCOME_WAGES',
    });
  }

  // Monthly rent on the 1st — last 3 months.
  for (let m = 0; m < 3; m++) {
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: checking,
      date: monthDay(today, m + 1, 1),
      amount: 1_750.0,
      name: 'Rent — Maple Street Apts',
      merchantName: 'Maple Street Apartments',
      category: 'RENT_AND_UTILITIES',
      subcategory: 'RENT_AND_UTILITIES_RENT',
    });
  }

  // Federal student loan payment, 5th of month.
  for (let m = 0; m < 3; m++) {
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: checking,
      date: monthDay(today, m + 1, 5),
      amount: 260.0,
      name: 'Federal Loan Servicing',
      merchantName: 'MOHELA',
      category: 'LOAN_PAYMENTS',
      subcategory: 'LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT',
    });
  }

  // Monthly HYSA contribution (transfer out of checking, in to savings).
  for (let m = 0; m < 3; m++) {
    const d = monthDay(today, m + 1, 8);
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: checking,
      date: d,
      amount: 1_000.0,
      name: 'Transfer to HYSA',
      merchantName: 'Internal Transfer',
      category: 'TRANSFER_OUT',
      subcategory: 'TRANSFER_OUT_SAVINGS',
    });
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: savings,
      date: d,
      amount: -1_000.0,
      name: 'Transfer from Checking',
      merchantName: 'Internal Transfer',
      category: 'TRANSFER_IN',
      subcategory: 'TRANSFER_IN_DEPOSIT',
    });
  }

  // Subscriptions — monthly.
  const subs: Array<[number, string, string, number]> = [
    [7, 'Netflix', 'NETFLIX', 15.49],
    [12, 'Spotify Family', 'SPOTIFY', 16.99],
    [20, 'NYT All Access', 'THE NEW YORK TIMES', 5.0],
    [18, 'PG&E Electric', 'PG&E', 64.32],
    [25, 'Internet — Sonic', 'SONIC.NET', 75.0],
    [1, 'CrossFit Membership', 'CROSSFIT NORTH', 165.0],
  ];
  for (let m = 0; m < 3; m++) {
    for (const [day, name, merchant, amt] of subs) {
      out.push({
        plaidTransactionId: txId(idx++),
        accountKey: checking,
        date: monthDay(today, m + 1, day),
        amount: amt,
        name,
        merchantName: merchant,
        category: name === 'PG&E Electric' || name === 'Internet — Sonic' ? 'RENT_AND_UTILITIES' : 'ENTERTAINMENT',
        subcategory: null,
      });
    }
  }

  // Groceries — 2-3 / week (~24 over 90 days).
  const grocers = ['Trader Joe\'s', 'Whole Foods', 'Safeway'];
  for (let i = 0; i < 24; i++) {
    const dayBack = 4 + i * 3 + ((i * 7) % 3);
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: cc,
      date: daysAgo(today, dayBack),
      amount: roundTo(38 + ((i * 13) % 70), 2),
      name: grocers[i % grocers.length] ?? 'Grocery',
      merchantName: grocers[i % grocers.length] ?? null,
      category: 'FOOD_AND_DRINK',
      subcategory: 'FOOD_AND_DRINK_GROCERIES',
    });
  }

  // Restaurants / coffee — ~36 entries.
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
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: cc,
      date: daysAgo(today, 2 + i * 2 + ((i * 3) % 4)),
      amount: roundTo(base + ((i * 1.3) % 11), 2),
      name,
      merchantName: name,
      category: 'FOOD_AND_DRINK',
      subcategory: i % 2 === 0 ? 'FOOD_AND_DRINK_COFFEE' : 'FOOD_AND_DRINK_RESTAURANT',
    });
  }

  // Gas — weekly.
  for (let i = 0; i < 12; i++) {
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: cc,
      date: daysAgo(today, 6 + i * 7),
      amount: roundTo(42 + ((i * 5) % 20), 2),
      name: 'Shell Gas Station',
      merchantName: 'Shell',
      category: 'TRANSPORTATION',
      subcategory: 'TRANSPORTATION_GAS',
    });
  }

  // Amazon scattered.
  const amazonAmounts = [27.99, 14.5, 89.0, 42.18, 18.95, 65.0, 124.5, 31.25, 9.99, 56.4];
  for (let i = 0; i < amazonAmounts.length; i++) {
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: cc,
      date: daysAgo(today, 5 + i * 8),
      amount: amazonAmounts[i]!,
      name: 'Amazon',
      merchantName: 'Amazon',
      category: 'GENERAL_MERCHANDISE',
      subcategory: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',
    });
  }

  // A few notable one-offs.
  out.push({
    plaidTransactionId: txId(idx++),
    accountKey: cc,
    date: daysAgo(today, 22),
    amount: 145.0,
    name: 'Outside Lands — Day Pass',
    merchantName: 'Eventbrite',
    category: 'ENTERTAINMENT',
    subcategory: 'ENTERTAINMENT_TV_AND_MOVIES',
  });
  out.push({
    plaidTransactionId: txId(idx++),
    accountKey: cc,
    date: daysAgo(today, 51),
    amount: 384.92,
    name: 'United Airlines — SFO→PDX',
    merchantName: 'United Airlines',
    category: 'TRAVEL',
    subcategory: 'TRAVEL_FLIGHTS',
  });

  // Credit card payoff each month (full balance).
  for (let m = 0; m < 3; m++) {
    out.push({
      plaidTransactionId: txId(idx++),
      accountKey: cc,
      date: monthDay(today, m + 1, 22),
      amount: -([400, 720, 580][m] ?? 500),
      name: 'Payment from Checking',
      merchantName: 'Internal Transfer',
      category: 'TRANSFER_IN',
      subcategory: 'TRANSFER_IN_CREDIT_CARD_PAYMENT',
    });
  }

  return out;
}

function monthDay(today: Date, monthsBack: number, day: number): Date {
  const d = new Date(today.getUTCFullYear(), today.getUTCMonth() - monthsBack + 1, day);
  return d;
}

function roundTo(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}
