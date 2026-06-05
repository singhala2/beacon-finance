import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from './lib/sentry-scrub';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}
