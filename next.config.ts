import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const isDev = process.env.NODE_ENV !== 'production';

function buildCsp(): string {
  const directives: Record<string, string[] | null> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      'https://cdn.plaid.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://cdn.plaid.com'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://*.plaid.com',
      'https://*.ingest.sentry.io',
      'https://*.ingest.us.sentry.io',
      ...(isDev ? ['ws://localhost:*', 'http://localhost:*'] : []),
    ],
    'frame-src': ['https://*.plaid.com', 'https://cdn.plaid.com'],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': isDev ? null : [],
  };

  return Object.entries(directives)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => (value && value.length > 0 ? `${key} ${value.join(' ')}` : key))
    .join('; ');
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: buildCsp() },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Source-map upload disabled (SENTRY_AUTH_TOKEN not set; deferred per Phase 7 plan).
  sourcemaps: { disable: true },
});
