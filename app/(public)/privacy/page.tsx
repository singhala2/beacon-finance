import Link from 'next/link';
import { TERMS_EFFECTIVE_DATE, TERMS_VERSION, SUPPORT_EMAIL } from '@/lib/terms';
import { DraftWatermark, LegalSection, LegalShell } from '@/components/legal/LegalShell';

export const metadata = { title: 'Privacy Policy — Beacon' };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" effective={TERMS_EFFECTIVE_DATE} version={TERMS_VERSION}>
      <DraftWatermark />

      <LegalSection title="1. Who we are">
        <p>
          Beacon is a personal finance product that connects to your existing bank, credit, and investment accounts (read-only) so you can see your money in one place and ask questions about it. This policy describes what information we collect, what we do with it, and the choices you have.
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <p>We collect only what is needed to operate the product.</p>
        <ul>
          <li>
            <strong>Account identifiers.</strong> The email address you sign up with, and a session token generated when you sign in.
          </li>
          <li>
            <strong>Profile fields you enter during onboarding.</strong> First name, age, location, risk tolerance, financial goals, and any free-text context you provide. All optional and all editable.
          </li>
          <li>
            <strong>Financial data from your connected institutions.</strong> Account names, balances, types, transactions, investment holdings, and institution names. Pulled through Plaid; see Section 4.
          </li>
          <li>
            <strong>Conversations with Beacon.</strong> Messages you send to the chat feature and Beacon&apos;s responses, retained so you can see your history.
          </li>
          <li>
            <strong>Technical data.</strong> IP address (for rate limiting and security), user agent, and a small amount of error context if something breaks.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect your bank credentials. Those are entered directly into Plaid&apos;s flow and never touch our servers.
        </p>
      </LegalSection>

      <LegalSection title="3. How we use it">
        <ul>
          <li>To show you your dashboard, transactions, goals, and insights.</li>
          <li>To generate AI-written insights and answers about your finances (see Section 5).</li>
          <li>To send the magic-link emails that sign you in.</li>
          <li>To debug crashes and abuse.</li>
        </ul>
        <p>
          We do not sell your data, share it with advertisers, or use it to train external AI models.
        </p>
      </LegalSection>

      <LegalSection title="4. Plaid">
        <p>
          We use Plaid to connect to your financial institutions. When you connect an account, you are working with Plaid&apos;s flow directly. Plaid sends us back tokens that let us read your account data on your behalf. Those tokens are encrypted at rest using AES-256-GCM with a key that lives outside the database.
        </p>
        <p>
          Plaid&apos;s own data practices are governed by{' '}
          <Link href="https://plaid.com/legal/#end-user-privacy-policy" style={{ color: 'var(--color-mint)' }}>
            Plaid&apos;s End User Privacy Policy
          </Link>
          . By connecting an institution through Beacon you also agree to those terms.
        </p>
        <p>
          You can disconnect any institution at any time from Settings → Integrations. Doing so revokes the access token with Plaid and deletes the associated accounts, holdings, and transactions from Beacon.
        </p>
      </LegalSection>

      <LegalSection title="5. AI services (Anthropic)">
        <p>
          Beacon&apos;s chat and AI-generated insights are powered by Anthropic&apos;s Claude. When you ask Beacon a question, we send Anthropic a short context summary of your financial state (account names, balances, recent transactions, goals) along with your question. Anthropic processes the request and returns an answer.
        </p>
        <p>
          Per Anthropic&apos;s API terms, your conversation content is not used to train their models.
        </p>
      </LegalSection>

      <LegalSection title="6. Other service providers">
        <ul>
          <li>
            <strong>Neon</strong> hosts our Postgres database. Data is encrypted at rest and in transit.
          </li>
          <li>
            <strong>Vercel</strong> hosts the app. Request logs are kept short-term for debugging.
          </li>
          <li>
            <strong>Resend</strong> delivers your sign-in emails.
          </li>
          <li>
            <strong>Upstash</strong> stores per-IP and per-user rate limit counters. No personally identifying content, only counters.
          </li>
          <li>
            <strong>Sentry</strong> receives error reports. We scrub emails, access tokens, and account numbers from those reports before they leave the server.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Your rights and choices">
        <ul>
          <li>
            <strong>Export your data.</strong> Settings → Data → &quot;Export your data&quot; returns a full JSON file of everything Beacon has stored about you.
          </li>
          <li>
            <strong>Delete your account.</strong> Settings → Data → &quot;Delete account&quot; permanently removes your user record and cascades deletes to every related row (accounts, transactions, holdings, conversations, insights, audit log).
          </li>
          <li>
            <strong>Disconnect a single institution.</strong> Settings → Integrations.
          </li>
          <li>
            <strong>Edit your profile.</strong> Settings → Profile.
          </li>
        </ul>
        <p>
          If you are in California, the EU, or another jurisdiction with stronger data rights, you may have additional protections; reach out at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--color-mint)' }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Retention">
        <p>
          We keep your data for as long as your account is active. When you delete your account the cascade is immediate. Backup snapshots from our database provider may retain some data for up to seven days before being expired.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies">
        <p>
          We use a single session cookie for sign-in. We do not load advertising or analytics trackers.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes">
        <p>
          If we change this policy in a way that affects you, we will note the new effective date and ask you to re-accept on next sign-in.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions or requests:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--color-mint)' }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
