import Link from 'next/link';
import { BBtn, BeaconLogo, ArrowIcon, SparkleIcon } from '@/components/ui';
import { Showcase } from '@/components/welcome/Showcase';

export default function WelcomePage() {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--color-bg-0)',
        display: 'flex',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
        overflow: 'hidden',
      }}
    >
      {/* Left — hero copy */}
      <div
        style={{
          flex: '1 1 0',
          minWidth: 0,
          padding: '40px 56px 40px 64px',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--color-line)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BeaconLogo size={20} color="var(--color-text)" />
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--color-text)',
                letterSpacing: -0.2,
              }}
            >
              Beacon
            </span>
          </div>
          <Link
            href="/signin"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-line-2)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 14px',
              color: 'var(--color-text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </div>

        <div style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'oklch(0.82 0.14 165 / 0.08)',
              border: '1px solid oklch(0.82 0.14 165 / 0.3)',
              borderRadius: 999,
              fontSize: 12,
              color: 'var(--color-mint)',
              marginBottom: 28,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.4,
            }}
          >
            <SparkleIcon size={12} color="var(--color-mint)" /> AI-NATIVE FINANCE COPILOT
          </div>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: -1.8,
              margin: '0 0 24px',
            }}
          >
            Your money,{' '}
            <span style={{ color: 'var(--color-mint)' }}>working with purpose.</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: 'var(--color-text-muted)',
              margin: '0 0 36px',
              maxWidth: 460,
            }}
          >
            Connect every account. Tell us your goals. Beacon builds and runs the strategy that gets
            you there.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/signin" style={{ textDecoration: 'none' }}>
              <BBtn
                variant="primary"
                size="lg"
                trailing={<ArrowIcon size={16} color="var(--color-mint-ink)" />}
              >
                Get started
              </BBtn>
            </Link>
            <Link href="/signin" style={{ textDecoration: 'none' }}>
              <BBtn variant="ghost" size="lg">
                I already have an account
              </BBtn>
            </Link>
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            gap: 24,
            color: 'var(--color-text-dim)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.5,
          }}
        >
          <span>5 MIN SETUP</span>
          <span>READ-ONLY BY DEFAULT</span>
          <span>BANK-LEVEL ENCRYPTION</span>
        </div>
      </div>

      {/* Right — revolving showcase */}
      <Showcase />
    </div>
  );
}
