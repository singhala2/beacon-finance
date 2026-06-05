import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from './lib/sentry-scrub';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    debug: process.env.SENTRY_DEBUG === '1',
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}
