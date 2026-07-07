// Phase 8 (8B) — PII redaction.
// Every excerpt we persist or send onward is scrubbed here first. We strip the
// two identifiers that carry the most harm and the least analytical value:
// Social Security numbers and full financial account numbers. Dollar amounts,
// dates, and employer names are the point of the Hub, so they are left intact.

const REDACTED = '[redacted]';

// SSN: 123-45-6789, 123 45 6789, or 9 bare digits when labelled as an SSN.
const SSN = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g;
const LABELLED_SSN = /\b(ssn|social security(?:\s+(?:no|number|#))?)\b[:\s#]*\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/gi;

// Full account / routing / card numbers: runs of 9+ digits, optionally grouped
// by spaces or dashes. Short numbers (amounts like 85000, dates, ZIPs) are kept.
const LONG_NUMBER = /\b(?:\d[ -]?){9,}\d\b/g;

// Account/routing numbers explicitly labelled, incl. masked forms like ****1234.
const LABELLED_ACCOUNT = /\b(account|acct|routing|card)\b[:\s#]*[*xX•\d][*xX•\d -]{3,}\d/gi;

/**
 * Remove SSNs and full account numbers from free text before it is stored on a
 * Document or logged. Order matters: labelled patterns run first so the label is
 * removed alongside the number, then bare patterns catch the rest.
 */
export function redactPii(input: string): string {
  if (!input) return input;
  return input
    .replace(LABELLED_SSN, REDACTED)
    .replace(LABELLED_ACCOUNT, REDACTED)
    .replace(SSN, REDACTED)
    .replace(LONG_NUMBER, REDACTED);
}

/**
 * Guard for individual extracted fact values. A confirmed fact should never BE
 * an SSN or account number. If a string value still looks like one after the
 * extractor ran, drop it rather than commit it.
 */
export function looksLikePii(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const stripped = value.trim();
  // Fresh, non-global patterns: a global regex's lastIndex would make .test()
  // stateful across calls.
  return /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/.test(stripped) || /\b(?:\d[ -]?){9,}\d\b/.test(stripped);
}
