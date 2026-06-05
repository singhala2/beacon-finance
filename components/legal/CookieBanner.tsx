'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'beacon.cookie.dismissed';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY) !== '1') {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 520,
        width: 'calc(100% - 32px)',
        padding: '12px 16px',
        background: 'var(--color-bg-2)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontSize: 13,
        color: 'var(--color-text-muted)',
        lineHeight: 1.5,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ flex: 1 }}>
        We use a single cookie for sign-in. No tracking, no ads. See our{' '}
        <Link href="/privacy" style={{ color: 'var(--color-mint)' }}>
          Privacy Policy
        </Link>
        .
      </span>
      <button
        onClick={dismiss}
        style={{
          padding: '6px 12px',
          background: 'var(--color-text)',
          color: 'var(--color-bg-0)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
          fontWeight: 540,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Got it
      </button>
    </div>
  );
}
