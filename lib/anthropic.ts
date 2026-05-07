import Anthropic from '@anthropic-ai/sdk';

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY env var is not set');
  cached = new Anthropic({ apiKey });
  return cached;
}

// Lazy-initialized accessor. Methods call into the real client on demand so
// env vars are validated at the first request, not at import time.
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop as keyof Anthropic];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

// Default model for chat. Swap to sonnet/opus for harder reasoning tasks if needed.
export const CHAT_MODEL = 'claude-haiku-4-5-20251001';
