import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { TERMS_VERSION } from '@/lib/terms';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'database' },
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM,
    }),
  ],
  pages: {
    signIn: '/signin',
    verifyRequest: '/signin/verify',
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      Sentry.setUser({ id: user.id });
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      await logAudit({ userId: user.id, action: 'auth.signin' });
      // The signin form gates submission on a clickwrap checkbox, so reaching
      // a successful signin implies acceptance of the current TERMS_VERSION.
      await db.user.update({
        where: { id: user.id },
        data: { acceptedTermsAt: new Date(), acceptedTermsVersion: TERMS_VERSION },
      });
    },
    async signOut(message) {
      const userId = 'session' in message ? message.session?.userId : message.token?.sub;
      if (userId) await logAudit({ userId, action: 'auth.signout' });
    },
  },
});
