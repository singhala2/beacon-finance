// Phase 8 — shared presentation helpers for facts. Used by the confirmation
// queue (8C) and the Hub (8D) so a fact renders the same everywhere.

import { formatCurrency } from '@/lib/format';
import { getFactType, type ValueType } from '@/lib/knowledge/registry';

/** Human label for a fact, from the registry; falls back to the raw key. */
export function factLabel(domain: string, key: string): string {
  return getFactType(domain, key)?.label ?? key;
}

/** Render a stored fact value for display, by its value type. */
export function formatFactValue(valueType: string, value: unknown, unit?: string): string {
  switch (valueType as ValueType) {
    case 'money': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? formatCurrency(n, { maximumFractionDigits: 0 }) : String(value ?? '');
    }
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      const shown = Number.isFinite(n) ? n.toLocaleString('en-US') : String(value ?? '');
      return unit ? `${shown} ${unit}` : shown;
    }
    case 'date': {
      const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
      return d && !Number.isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : String(value ?? '');
    }
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return String(value ?? '');
  }
}

/**
 * Pull the evidence line for a specific fact key out of a Document's
 * sourceExcerpt. The extractor stores excerpt lines as `key: evidence`, so we
 * find the line for this key. Returns null when there is no match.
 */
export function evidenceForKey(sourceExcerpt: string | null | undefined, key: string): string | null {
  if (!sourceExcerpt) return null;
  for (const line of sourceExcerpt.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0 && line.slice(0, idx).trim() === key) {
      const rest = line.slice(idx + 1).trim();
      if (rest) return rest;
    }
  }
  return null;
}
