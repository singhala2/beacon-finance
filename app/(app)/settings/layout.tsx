'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const TABS = [
  { id: 'profile',      label: 'Profile',      href: '/settings' },
  { id: 'integrations', label: 'Integrations', href: '/settings/integrations' },
  { id: 'data',         label: 'Data',         href: '/settings/data' },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ maxWidth: 720 }}>
      <h1
        style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: -0.6,
          margin: '0 0 4px',
          lineHeight: 1.1,
        }}
      >
        Settings
      </h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 18px' }}>
        Manage your profile, connected institutions, and your data.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--color-line)',
          marginBottom: 22,
        }}
      >
        {TABS.map((t) => {
          const active =
            t.href === '/settings' ? pathname === '/settings' : pathname.startsWith(t.href);
          return (
            <Link
              key={t.id}
              href={t.href}
              style={{
                padding: '8px 14px',
                fontSize: 13,
                color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: active ? 540 : 400,
                textDecoration: 'none',
                borderBottom: `2px solid ${active ? 'var(--color-mint)' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
