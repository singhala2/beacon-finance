const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

type LogLevel = 'info' | 'warn' | 'error';

function serializeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    if (v instanceof Error) {
      out[k] = { name: v.name, message: v.message, stack: v.stack };
    } else {
      out[k] = v;
    }
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (isTest) return;
  if (isProd) {
    // console.log (not process.stdout.write) so this module stays importable
    // from Edge Runtime bundles (middleware, edge routes). Both write one line
    // to stdout in the Node server; the Edge analyzer rejects process.stdout.
    const payload = { level, message, ...serializeContext(context), ts: new Date().toISOString() };
    console.log(JSON.stringify(payload));
    return;
  }
  const tag = level === 'error' ? '[err]' : level === 'warn' ? '[warn]' : '[info]';
  if (context) {
    console.log(tag, message, context);
  } else {
    console.log(tag, message);
  }
}

export const log = {
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};
