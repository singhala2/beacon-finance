// Plaid Personal Finance Category primary values mapped to display labels.
const PFC_LABELS: Record<string, string> = {
  INCOME: 'Income',
  TRANSFER_IN: 'Transfers in',
  TRANSFER_OUT: 'Transfers out',
  LOAN_PAYMENTS: 'Loans',
  BANK_FEES: 'Bank fees',
  ENTERTAINMENT: 'Entertainment',
  FOOD_AND_DRINK: 'Food and drink',
  GENERAL_MERCHANDISE: 'Shopping',
  HOME_IMPROVEMENT: 'Home',
  MEDICAL: 'Medical',
  PERSONAL_CARE: 'Personal care',
  GENERAL_SERVICES: 'Services',
  GOVERNMENT_AND_NON_PROFIT: 'Government',
  TRANSPORTATION: 'Transit',
  TRAVEL: 'Travel',
  RENT_AND_UTILITIES: 'Rent and utilities',
};

export function labelForCategory(cat: string | null | undefined): string {
  if (!cat) return 'Uncategorized';
  return PFC_LABELS[cat] ?? cat.toLowerCase().replace(/_/g, ' ');
}

export function formatTransactionDate(d: Date, now: Date = new Date()): string {
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

type CurrencyOpts = {
  currency?: string;
  maximumFractionDigits?: number;
  emptyDisplay?: string;
};

export function formatCurrency(
  n: number | null | undefined,
  opts: CurrencyOpts = {},
): string {
  const { currency = 'USD', maximumFractionDigits = 2, emptyDisplay = '' } = opts;
  if (n === null || n === undefined) return emptyDisplay;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(n);
}
