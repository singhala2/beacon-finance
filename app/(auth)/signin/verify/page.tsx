import Link from 'next/link';
import { BeaconLogo } from '@/components/ui';

export default async function VerifyRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--color-bg-0)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <BeaconLogo size={22} color="var(--color-text)" />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>Beacon</span>
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: -0.8,
            margin: '0 0 10px',
            lineHeight: 1.15,
          }}
        >
          Check your inbox.
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--color-text-muted)',
            lineHeight: 1.55,
            margin: '0 0 8px',
          }}
        >
          We sent a one-time sign-in link
          {email ? (
            <>
              {' '}
              to <span style={{ color: 'var(--color-text)' }}>{email}</span>.
            </>
          ) : (
            '.'
          )}{' '}
          The link expires in 24 hours.
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-dim)',
            margin: '20px 0 0',
          }}
        >
          Did not get it? Check your spam folder, or{' '}
          <Link href="/signin" style={{ color: 'var(--color-mint)' }}>
            try again
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
