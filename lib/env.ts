import { z } from 'zod';

const HEX_64 = /^[0-9a-fA-F]{64}$/;

const requiredSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1),
  AUTH_RESEND_KEY: z.string().min(1),
  AUTH_EMAIL_FROM: z.string().min(1),
  PLAID_CLIENT_ID: z.string().min(1),
  PLAID_SECRET: z.string().min(1),
  ENCRYPTION_KEY: z.string().regex(HEX_64, 'must be 64 hex chars (32 bytes)'),
  ANTHROPIC_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(16),
});

const optionalSchema = z.object({
  NEXTAUTH_URL: z.string().url().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

export function validateEnv(): void {
  const required = requiredSchema.safeParse(process.env);
  if (!required.success) {
    const issues = required.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Required environment variables missing or invalid:\n${issues}`);
  }

  const optional = optionalSchema.safeParse(process.env);
  if (!optional.success) {
    const issues = optional.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.warn(`[env] Optional environment variables present but invalid:\n${issues}`);
  }

  const missingOptional: string[] = [];
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    missingOptional.push('UPSTASH_* (rate limiting will no-op)');
  }
  if (!process.env.SENTRY_DSN) {
    missingOptional.push('SENTRY_DSN (error monitoring off)');
  }
  if (missingOptional.length > 0) {
    console.warn(`[env] Optional services unconfigured: ${missingOptional.join(', ')}`);
  }
}
