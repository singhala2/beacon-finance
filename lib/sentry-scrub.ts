import type { Event, Breadcrumb } from '@sentry/nextjs';

const SENSITIVE_KEYS = [
  'email',
  'accesstoken',
  'access_token',
  'public_token',
  'publictoken',
  'password',
  'token',
  'authorization',
  'cookie',
  'mask',
  'encryption_key',
  'plaid_secret',
];

const EMAIL_RE = /\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g;

function redactString(s: string): string {
  return s.replace(EMAIL_RE, '[email]');
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s));
}

function scrub(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value);
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(scrub);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitiveKey(k) ? '[redacted]' : scrub(v);
  }
  return out;
}

export function scrubEvent<T extends Event>(event: T): T {
  const req = event.request;
  if (req) {
    if (req.data !== undefined) req.data = scrub(req.data) as typeof req.data;
    if (req.headers) req.headers = scrub(req.headers) as typeof req.headers;
    if (req.query_string) req.query_string = scrub(req.query_string) as typeof req.query_string;
  }
  if (event.extra) event.extra = scrub(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
  if (event.message) event.message = redactString(event.message);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b: Breadcrumb) => {
      const next: Breadcrumb = { ...b };
      if (next.message) next.message = redactString(next.message);
      if (next.data) next.data = scrub(next.data) as typeof next.data;
      return next;
    });
  }
  return event;
}
