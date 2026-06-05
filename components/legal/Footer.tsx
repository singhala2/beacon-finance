import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/terms';

export function Footer() {
  return (
    <footer
      style={{
        marginTop: 32,
        padding: '20px 24px',
        fontSize: 12,
        color: 'var(--color-text-dim)',
        fontFamily: 'var(--font-mono)',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
        Privacy
      </Link>
      <span>·</span>
      <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>
        Terms
      </Link>
      <span>·</span>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        style={{ color: 'inherit', textDecoration: 'none' }}
      >
        Contact
      </a>
    </footer>
  );
}
