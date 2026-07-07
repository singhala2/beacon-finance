// Phase 8 — Knowledge Hub registry.
//
// This is the load-bearing declaration for the whole feature. Domains, fact
// types, and document types are declared here as data. Storage validation, the
// extractor, the Hub UI, and the chat-context assembler are all generic
// consumers of this file. Supporting a new document type or fact is a
// declaration here, not a new code path, table, or page.

export type ValueType = 'money' | 'text' | 'enum' | 'date' | 'number' | 'boolean';

// Drives what the Hub solicits and how the chat-context budget is prioritized.
// Ranked by marginal utility over what Beacon already sees through Plaid.
export type MarginalWeight = 'high' | 'medium' | 'low';

export type DomainKey =
  | 'income'
  | 'retirement'
  | 'debt'
  | 'housing'
  | 'insurance'
  | 'taxes'
  | 'benefits'
  | 'household'
  | 'goals'
  | 'estate';

export type FactType = {
  key: string; // unique within its domain
  label: string;
  valueType: ValueType;
  marginalWeight: MarginalWeight;
  unit?: string; // e.g. "%", "USD/yr" — for display only
  enumOptions?: readonly string[]; // required when valueType === 'enum'
};

export type Domain = {
  key: DomainKey;
  label: string;
  description: string;
  order: number; // display + context-budget priority ordering
  factTypes: readonly FactType[];
};

// A field the generic extractor asks Claude to pull from a document, mapped to
// the fact it becomes. `description` is guidance handed to the model.
export type ExtractionField = {
  factKey: string;
  domain: DomainKey;
  valueType: ValueType;
  description: string;
};

export type DocumentType = {
  key: string;
  label: string;
  domains: readonly DomainKey[];
  description: string; // used for classification + shown in the upload UI
  extractionFields: readonly ExtractionField[];
};

// ---------------------------------------------------------------------------
// Domains
//
// The v1 taxonomy. Income is fully specced for the first build slice; the rest
// are seeded with their highest-marginal fact types and grow by declaration.
// ---------------------------------------------------------------------------

export const DOMAINS: readonly Domain[] = [
  {
    key: 'income',
    label: 'Income & Employment',
    description: 'What you earn, how you are paid, and the comp Plaid cannot see.',
    order: 1,
    factTypes: [
      { key: 'gross_annual_salary', label: 'Gross annual salary', valueType: 'money', marginalWeight: 'high' },
      { key: 'pay_frequency', label: 'Pay frequency', valueType: 'enum', marginalWeight: 'medium', enumOptions: ['weekly', 'biweekly', 'semimonthly', 'monthly'] },
      { key: 'employer_name', label: 'Employer', valueType: 'text', marginalWeight: 'medium' },
      { key: 'gross_pay_per_period', label: 'Gross pay per period', valueType: 'money', marginalWeight: 'high' },
      { key: 'net_pay_per_period', label: 'Net pay per period', valueType: 'money', marginalWeight: 'medium' },
      { key: 'federal_tax_withheld_per_period', label: 'Federal tax withheld (per period)', valueType: 'money', marginalWeight: 'medium' },
      { key: 'bonus_target', label: 'Bonus / target', valueType: 'money', marginalWeight: 'high' },
      { key: 'equity_grant_value', label: 'Equity grant value', valueType: 'money', marginalWeight: 'high' },
      { key: 'equity_vesting_schedule', label: 'Equity vesting schedule', valueType: 'text', marginalWeight: 'high' },
      { key: 'employment_start_date', label: 'Start date', valueType: 'date', marginalWeight: 'low' },
    ],
  },
  {
    key: 'retirement',
    label: 'Retirement',
    description: 'Contribution rates, employer match, and tax-advantaged accounts.',
    order: 2,
    factTypes: [
      { key: 'employer_401k_match', label: '401(k) employer match', valueType: 'text', marginalWeight: 'high' },
      { key: 'retirement_contribution_percent', label: 'Retirement contribution rate', valueType: 'number', marginalWeight: 'high', unit: '%' },
      { key: 'retirement_contribution_per_period', label: 'Retirement contribution (per period)', valueType: 'money', marginalWeight: 'high' },
    ],
  },
  {
    key: 'debt',
    label: 'Debt & Credit',
    description: 'The terms behind your balances: rates, servicers, and payoff timelines.',
    order: 3,
    factTypes: [
      { key: 'loan_apr', label: 'Loan APR', valueType: 'number', marginalWeight: 'high', unit: '%' },
      { key: 'loan_principal', label: 'Loan principal / balance', valueType: 'money', marginalWeight: 'medium' },
      { key: 'loan_servicer', label: 'Servicer', valueType: 'text', marginalWeight: 'medium' },
      { key: 'loan_term_months', label: 'Loan term', valueType: 'number', marginalWeight: 'low', unit: 'months' },
      { key: 'minimum_payment', label: 'Minimum payment', valueType: 'money', marginalWeight: 'medium' },
    ],
  },
  {
    key: 'housing',
    label: 'Housing',
    description: 'Rent or mortgage terms and the obligations around your home.',
    order: 4,
    factTypes: [
      { key: 'monthly_rent', label: 'Monthly rent', valueType: 'money', marginalWeight: 'high' },
      { key: 'lease_end_date', label: 'Lease end date', valueType: 'date', marginalWeight: 'medium' },
      { key: 'mortgage_rate', label: 'Mortgage rate', valueType: 'number', marginalWeight: 'high', unit: '%' },
    ],
  },
  {
    key: 'insurance',
    label: 'Insurance & Protection',
    description: 'Premiums, deductibles, and coverage that shape your risk.',
    order: 5,
    factTypes: [
      { key: 'health_premium_per_period', label: 'Health premium (per period)', valueType: 'money', marginalWeight: 'medium' },
      { key: 'health_deductible', label: 'Health deductible', valueType: 'money', marginalWeight: 'medium' },
    ],
  },
  {
    key: 'taxes',
    label: 'Taxes',
    description: 'Filing status, effective rate, and the whole-picture tax view.',
    order: 6,
    factTypes: [
      { key: 'filing_status', label: 'Filing status', valueType: 'enum', marginalWeight: 'medium', enumOptions: ['single', 'married_joint', 'married_separate', 'head_of_household'] },
      { key: 'adjusted_gross_income', label: 'Adjusted gross income', valueType: 'money', marginalWeight: 'high' },
    ],
  },
  {
    key: 'benefits',
    label: 'Benefits',
    description: 'Employer contributions and benefits the paycheck hides.',
    order: 7,
    factTypes: [
      { key: 'hsa_contribution', label: 'HSA contribution', valueType: 'money', marginalWeight: 'medium' },
    ],
  },
  {
    key: 'household',
    label: 'Household & Dependents',
    description: 'Who you support and share finances with.',
    order: 8,
    factTypes: [
      { key: 'dependents_count', label: 'Number of dependents', valueType: 'number', marginalWeight: 'medium' },
    ],
  },
  {
    key: 'goals',
    label: 'Goals & Plans',
    description: 'Forward-looking intentions Beacon should plan around.',
    order: 9,
    factTypes: [
      { key: 'planned_major_purchase', label: 'Planned major purchase', valueType: 'text', marginalWeight: 'medium' },
    ],
  },
  {
    key: 'estate',
    label: 'Estate & Legal',
    description: 'Where assets go and the legal structure around them.',
    order: 10,
    factTypes: [
      { key: 'has_will', label: 'Has a will', valueType: 'boolean', marginalWeight: 'low' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Document types
//
// The Income slice for the first build. More doc types are declarations on top
// of the working pipeline. Only declare a document type Plaid cannot already
// see (never bank/card/brokerage statements).
// ---------------------------------------------------------------------------

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  {
    key: 'pay_stub',
    label: 'Pay stub',
    domains: ['income', 'retirement', 'insurance'],
    description: 'A recent paycheck stub. Shows gross vs net pay, deductions, retirement contributions, and taxes withheld — none of which Plaid can see.',
    extractionFields: [
      { factKey: 'employer_name', domain: 'income', valueType: 'text', description: 'The employer / company name paying the wages.' },
      { factKey: 'gross_pay_per_period', domain: 'income', valueType: 'money', description: 'Gross pay for this pay period, before any deductions.' },
      { factKey: 'net_pay_per_period', domain: 'income', valueType: 'money', description: 'Net take-home pay for this pay period.' },
      { factKey: 'pay_frequency', domain: 'income', valueType: 'enum', description: 'How often the person is paid: weekly, biweekly, semimonthly, or monthly.' },
      { factKey: 'federal_tax_withheld_per_period', domain: 'income', valueType: 'money', description: 'Federal income tax withheld this period.' },
      { factKey: 'retirement_contribution_per_period', domain: 'retirement', valueType: 'money', description: 'Employee 401(k)/403(b) or other retirement contribution this period.' },
      { factKey: 'health_premium_per_period', domain: 'insurance', valueType: 'money', description: 'Health insurance premium deducted this period, if shown.' },
    ],
  },
  {
    key: 'offer_letter',
    label: 'Offer letter',
    domains: ['income', 'retirement'],
    description: 'An employment offer or contract. Forward-looking comp: base salary, bonus, equity, match, and start date.',
    extractionFields: [
      { factKey: 'employer_name', domain: 'income', valueType: 'text', description: 'The company extending the offer.' },
      { factKey: 'gross_annual_salary', domain: 'income', valueType: 'money', description: 'Annual base salary offered.' },
      { factKey: 'bonus_target', domain: 'income', valueType: 'money', description: 'Target or guaranteed bonus, as a dollar amount if stated.' },
      { factKey: 'equity_grant_value', domain: 'income', valueType: 'money', description: 'Total dollar value of any equity/RSU/option grant.' },
      { factKey: 'equity_vesting_schedule', domain: 'income', valueType: 'text', description: 'The vesting schedule in words, e.g. "4 years, 1-year cliff".' },
      { factKey: 'employment_start_date', domain: 'income', valueType: 'date', description: 'The start date in the offer.' },
      { factKey: 'employer_401k_match', domain: 'retirement', valueType: 'text', description: 'The 401(k) match formula, e.g. "100% up to 4%".' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookups + validation
// ---------------------------------------------------------------------------

const DOMAIN_BY_KEY = new Map(DOMAINS.map((d) => [d.key, d]));
const DOC_TYPE_BY_KEY = new Map(DOCUMENT_TYPES.map((d) => [d.key, d]));

export function getDomain(key: string): Domain | undefined {
  return DOMAIN_BY_KEY.get(key as DomainKey);
}

export function getFactType(domain: string, factKey: string): FactType | undefined {
  return getDomain(domain)?.factTypes.find((f) => f.key === factKey);
}

export function getDocumentType(key: string): DocumentType | undefined {
  return DOC_TYPE_BY_KEY.get(key);
}

export function isKnownFactKey(domain: string, factKey: string): boolean {
  return getFactType(domain, factKey) !== undefined;
}

// Coerces + validates a raw value against a fact type. Returns the normalized
// value on success, or an error string. The single source of truth for what a
// storable fact value looks like — used by every ingestion adapter.
export function validateFactValue(
  factType: FactType,
  raw: unknown,
): { ok: true; value: string | number | boolean } | { ok: false; error: string } {
  switch (factType.valueType) {
    case 'money':
    case 'number': {
      const n = typeof raw === 'string' ? Number(raw.replace(/[$,%\s]/g, '')) : raw;
      if (typeof n !== 'number' || !Number.isFinite(n)) {
        return { ok: false, error: `expected a number for ${factType.key}` };
      }
      return { ok: true, value: n };
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return { ok: true, value: raw };
      if (raw === 'true' || raw === 'false') return { ok: true, value: raw === 'true' };
      return { ok: false, error: `expected a boolean for ${factType.key}` };
    }
    case 'date': {
      if (typeof raw !== 'string' && !(raw instanceof Date)) {
        return { ok: false, error: `expected a date for ${factType.key}` };
      }
      const d = raw instanceof Date ? raw : new Date(raw);
      if (Number.isNaN(d.getTime())) return { ok: false, error: `invalid date for ${factType.key}` };
      return { ok: true, value: d.toISOString() };
    }
    case 'enum': {
      if (typeof raw !== 'string' || !factType.enumOptions?.includes(raw)) {
        return { ok: false, error: `expected one of [${factType.enumOptions?.join(', ')}] for ${factType.key}` };
      }
      return { ok: true, value: raw };
    }
    case 'text': {
      if (typeof raw !== 'string' || raw.trim() === '') {
        return { ok: false, error: `expected non-empty text for ${factType.key}` };
      }
      return { ok: true, value: raw.trim() };
    }
  }
}
