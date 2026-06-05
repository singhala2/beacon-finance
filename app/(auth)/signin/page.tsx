'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { BBtn, BeaconLogo, BInput, ArrowIcon } from '@/components/ui';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email.');
      return;
    }
    if (!accepted) {
      setError('Please agree to the Terms and Privacy Policy.');
      return;
    }

    startTransition(async () => {
      const res = await signIn('resend', {
        email: email.trim(),
        redirect: false,
        callbackUrl: '/',
      });

      if (!res || res.error) {
        setError(res?.error ?? 'Could not send link. Try again.');
        return;
      }

      router.push(`/signin/verify?email=${encodeURIComponent(email.trim())}`);
    });
  }

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
      <div style={{ width: '100%', maxWidth: 420 }}>
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
          Welcome.
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--color-text-muted)',
            lineHeight: 1.55,
            margin: '0 0 28px',
          }}
        >
          Enter your email and we will send a one-time link.
        </p>

        <label
          htmlFor="email"
          style={{
            display: 'block',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Email
        </label>
        <BInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@email.com"
          value={email}
          onChange={setEmail}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />

        {error && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-danger)',
              marginTop: 12,
            }}
          >
            {error}
          </div>
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginTop: 20,
            fontSize: 12.5,
            color: 'var(--color-text-muted)',
            lineHeight: 1.55,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            style={{ marginTop: 3, accentColor: 'var(--color-mint)' }}
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" style={{ color: 'var(--color-mint)' }}>
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" style={{ color: 'var(--color-mint)' }}>
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <div style={{ marginTop: 16 }}>
          <BBtn
            variant="primary"
            size="lg"
            fullWidth
            onClick={submit}
            disabled={isPending || !accepted}
            trailing={<ArrowIcon size={16} color="var(--color-mint-ink)" />}
          >
            {isPending ? 'Sending…' : 'Send magic link'}
          </BBtn>
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 12,
            color: 'var(--color-text-dim)',
            textAlign: 'center',
          }}
        >
          <Link href="/welcome" style={{ color: 'var(--color-text-muted)' }}>
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
