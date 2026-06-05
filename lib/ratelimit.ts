import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type Limiter = {
  limit(key: string): Promise<LimitResult>;
};

const enabled =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = enabled ? Redis.fromEnv() : null;

type Window = `${number} ${'s' | 'm' | 'h' | 'd'}`;

function make(prefix: string, count: number, window: Window): Limiter {
  if (!redis) {
    return {
      async limit() {
        return { success: true, limit: count, remaining: count, reset: Date.now() };
      },
    };
  }
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(count, window),
    analytics: true,
    prefix,
  });
  return {
    async limit(key) {
      const r = await rl.limit(key);
      return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
    },
  };
}

export const authLimit = make('rl:auth', 5, '1 m');
export const plaidLimit = make('rl:plaid', 10, '1 m');
export const chatLimit = make('rl:chat', 30, '1 m');
export const insightsGenLimit = make('rl:insights', 3, '1 h');
export const exportLimit = make('rl:export', 3, '1 d');

export function tooManyRequests(result: LimitResult): NextResponse {
  const retryAfter = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: 'Too many requests',
      resetAt: new Date(result.reset).toISOString(),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
        'Retry-After': String(retryAfter),
      },
    },
  );
}

export function extractIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    if (first) return first.trim();
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}
