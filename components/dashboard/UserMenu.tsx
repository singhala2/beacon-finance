'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

type Props = {
  user: { firstName: string | null; name: string | null; email: string };
  trigger: 'expanded' | 'collapsed';
  initials: string;
};

const SETTINGS_LINKS = [
  { href: '/settings', label: 'Profile' },
  { href: '/settings/integrations', label: 'Integrations' },
  { href: '/settings/data', label: 'Data' },
];

export function UserMenu({ user, trigger, initials }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: '/welcome' });
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: trigger === 'expanded' ? '100%' : 'auto' }}>
      {trigger === 'expanded' ? (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Account menu"
          aria-expanded={open}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 6px',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--color-mint), var(--color-indigo))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: '#000',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--color-text)',
                fontWeight: 540,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.firstName ?? user.name ?? user.email}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--color-text-dim)',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.email}
            </div>
          </div>
          <ChevronUpDown />
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Account menu"
          aria-expanded={open}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--color-mint), var(--color-indigo))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: '#000',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {initials}
        </button>
      )}

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            bottom: trigger === 'expanded' ? 'calc(100% + 6px)' : 'auto',
            left: trigger === 'expanded' ? 0 : 'calc(100% + 8px)',
            top: trigger === 'collapsed' ? 0 : 'auto',
            minWidth: 220,
            background: 'var(--color-bg-2)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            padding: 6,
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: '10px 10px 8px',
              borderBottom: '1px solid var(--color-line)',
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 12.5, color: 'var(--color-text)', fontWeight: 540 }}>
              {user.firstName ?? user.name ?? user.email}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-dim)',
                fontFamily: 'var(--font-mono)',
                marginTop: 2,
                wordBreak: 'break-all',
              }}
            >
              {user.email}
            </div>
          </div>
          {SETTINGS_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                color: 'var(--color-text)',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid var(--color-line)', margin: '4px 0' }} />
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            role="menuitem"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: signingOut ? 'wait' : 'pointer',
              fontSize: 13,
              color: 'var(--color-text)',
              textAlign: 'left',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <SignOutIcon />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

function ChevronUpDown() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5 6l3-3 3 3M5 10l3 3 3-3"
        stroke="var(--color-text-dim)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M9 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h5"
        stroke="var(--color-text-muted)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M11 5l3 3-3 3M14 8H7"
        stroke="var(--color-text-muted)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
