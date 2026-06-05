import Link from 'next/link';
import { TERMS_EFFECTIVE_DATE, TERMS_VERSION, SUPPORT_EMAIL } from '@/lib/terms';
import { DraftWatermark, LegalSection, LegalShell } from '@/components/legal/LegalShell';

export const metadata = { title: 'Terms of Service — Beacon' };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" effective={TERMS_EFFECTIVE_DATE} version={TERMS_VERSION}>
      <DraftWatermark />

      <LegalSection title="1. Agreement">
        <p>
          By creating an account or using Beacon you agree to these terms and to the{' '}
          <Link href="/privacy" style={{ color: 'var(--color-mint)' }}>
            Privacy Policy
          </Link>
          . If you do not agree, do not use the product.
        </p>
      </LegalSection>

      <LegalSection title="2. What Beacon is and is not">
        <p>
          Beacon is an informational personal finance tool. It surfaces your account balances, transactions, holdings, and goals, and lets you ask questions about them via an AI assistant.
        </p>
        <p>
          <strong>Beacon is not a fiduciary, financial advisor, accountant, broker, or tax preparer.</strong> Information shown in the product, including AI-generated insights and chat responses, is not investment advice, tax advice, legal advice, or a recommendation to buy or sell any security. Verify anything that matters with a qualified professional.
        </p>
      </LegalSection>

      <LegalSection title="3. Your account">
        <ul>
          <li>You must provide a real email address that you control.</li>
          <li>You must be at least 18 years old, or the age of majority in your jurisdiction.</li>
          <li>You are responsible for keeping access to your email account secure, since the magic-link sign-in flow depends on it.</li>
          <li>You may not use Beacon to access an account that does not belong to you.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Reverse-engineer, decompile, or attempt to extract source code from the product, except where applicable law expressly permits.</li>
          <li>Use the product to send spam, phish, or harass anyone.</li>
          <li>Probe the product for vulnerabilities except under a coordinated security-research process. If you find a vulnerability, see{' '}
            <a href="/.well-known/security.txt" style={{ color: 'var(--color-mint)' }}>
              /.well-known/security.txt
            </a>
            .
          </li>
          <li>Scrape, mass-export, or resell any data the product provides.</li>
          <li>Use the product to violate any law.</li>
        </ul>
        <p>
          We may apply rate limits, suspend, or terminate accounts that abuse the service.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-party services">
        <p>
          Beacon depends on Plaid (data aggregation), Anthropic (AI), and several infrastructure providers listed in the Privacy Policy. Your use of the product is also governed by{' '}
          <Link href="https://plaid.com/legal/#end-user-privacy-policy" style={{ color: 'var(--color-mint)' }}>
            Plaid&apos;s End User Privacy Policy
          </Link>
          . Outages, errors, or changes in those providers may affect Beacon, and we are not responsible for them.
        </p>
      </LegalSection>

      <LegalSection title="6. Read-only access">
        <p>
          Beacon connects to your financial institutions in a read-only capacity. It cannot move money, change bank-account settings, or initiate transactions on your behalf.
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          You may delete your account at any time from Settings → Data. We may suspend or terminate accounts that violate these terms or that we reasonably suspect of abuse. When your account ends, your data is deleted as described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimers">
        <p>
          The product is provided <strong>as is</strong> and <strong>as available</strong>, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, accuracy, or non-infringement. We do not warrant that the product will be uninterrupted, error-free, or that any information shown is accurate or current.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, in no event will Beacon, its operators, or its service providers be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, lost data, or other intangible losses, arising from your use of the product, even if advised of the possibility of such damages.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for consequential damages; in such jurisdictions our liability is limited to the maximum extent permitted.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes">
        <p>
          We may update these terms. If we do, we will note the new effective date and ask you to re-accept on next sign-in. Continued use after the new effective date means you accept the update.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--color-mint)' }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
