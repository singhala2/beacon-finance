import type { ReactNode } from 'react';
import Link from 'next/link';
import { BeaconLogo, LockIcon } from '@/components/ui';

const TOTAL_STEPS = 6;

type Props = {
  step: number; // 1..TOTAL_STEPS
  left: ReactNode;
  right: ReactNode;
  backHref?: string;
};

export function DScreen({ step, left, right, backHref }: Props) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--color-bg-0)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
        overflow: 'hidden',
      }}
    >
      {/* Left rail */}
      <div
        style={{
          width: 360,
          flexShrink: 0,
          background: 'var(--color-bg-1)',
          borderRight: '1px solid var(--color-line)',
          padding: '40px 36px 32px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {backHref && (
            <Link
              href={backHref}
              aria-label="Go back"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted)',
                marginLeft: -6,
                marginRight: 2,
                flexShrink: 0,
                textDecoration: 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M10 3L5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
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

        {/* Step indicator */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 2,
                  background: i < step ? 'var(--color-mint)' : 'var(--color-line-2)',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-dim)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.5,
            }}
          >
            STEP {String(step).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
          </div>
        </div>

        {/* Left copy area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: 16,
          }}
        >
          {left}
        </div>

        {/* Footer security note */}
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <LockIcon size={11} color="currentColor" /> Bank-level encryption · Powered by Plaid
        </div>
      </div>

      {/* Right pane */}
      <div
        style={{
          flex: 1,
          padding: '56px 72px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {right}
      </div>
    </div>
  );
}
