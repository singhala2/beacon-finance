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
