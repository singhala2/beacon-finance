import type { ReactNode } from 'react';
import Link from 'next/link';
import { BeaconLogo } from '@/components/ui';

type Props = {
  title: string;
  effective: string;
  version: string;
  children: ReactNode;
};

export function LegalShell({ title, effective, version, children }: Props) {
  return (
    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 36,
          textDecoration: 'none',
          color: 'var(--color-text)',
        }}
      >
        <BeaconLogo size={20} color="var(--color-text)" />
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Beacon</span>
      </Link>

      <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.7, margin: '0 0 6px' }}>
        {title}
      </h1>
      <p
        style={{
          fontSize: 12,
          color: 'var(--color-text-dim)',
          fontFamily: 'var(--font-mono)',
          margin: 0,
        }}
      >
        Effective {effective} · v{version}
      </p>

      <div style={{ marginTop: 32, fontSize: 14.5, lineHeight: 1.65, color: 'var(--color-text)' }}>
        {children}
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: -0.2,
          margin: '0 0 10px',
          color: 'var(--color-text)',
        }}
      >
        {title}
      </h2>
      <div style={{ color: 'var(--color-text-muted)' }}>{children}</div>
    </section>
  );
}

export function DraftWatermark() {
  return (
    <div
      style={{
        marginBottom: 28,
        padding: '12px 14px',
        background: 'var(--color-bg-2)',
        border: '1px dashed var(--color-line-2)',
        borderRadius: 'var(--radius-md)',
        fontSize: 12.5,
        color: 'var(--color-text-muted)',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: 'var(--color-text)' }}>Draft.</strong> This document has not yet been
      reviewed by counsel. It is published in good faith and reflects current data practices, but
      should not be relied upon for compliance purposes until reviewed.
    </div>
  );
}
