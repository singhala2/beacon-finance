'use client';

import Link from 'next/link';
import { ArrowIcon } from '@/components/ui';

export type BriefTag = 'WIN' | 'WATCH' | 'PLAN';

const TAG_COLOR: Record<BriefTag, string> = {
  WIN: 'var(--color-mint)',
  WATCH: 'var(--color-warn)',
  PLAN: 'var(--color-indigo)',
};

type Props = {
  tag: BriefTag;
  title: string;
  body: string;
  cta?: string;
  // Persisted-insight only — gives us a target for dismiss + chat handoff
  id?: string;
  onDismiss?: () => void;
};

export function BriefCard({ tag, title, body, cta, id, onDismiss }: Props) {
  const color = TAG_COLOR[tag];
  const chatHref = id
    ? `/chat?q=${encodeURIComponent(`Help me act on this insight: ${title}. ${body}`)}`
    : null;

  return (
    <div
      style={{
        background: 'var(--color-bg-2)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: 0.6,
            fontFamily: 'var(--font-mono)',
            color,
            padding: '2px 6px',
            borderRadius: 3,
            background: `color-mix(in oklab, ${color} 15%, transparent)`,
            textTransform: 'uppercase',
          }}
        >
          {tag}
        </span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss insight"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-faint)',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>{body}</div>
      {cta && (
        chatHref ? (
          <Link
            href={chatHref}
            style={{
              marginTop: 4,
              alignSelf: 'flex-start',
              color: 'var(--color-mint)',
              fontSize: 12,
              fontWeight: 540,
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
            }}
          >
            {cta} <ArrowIcon size={11} color="var(--color-mint)" />
          </Link>
        ) : (
          <div
            style={{
              marginTop: 4,
              alignSelf: 'flex-start',
              color: 'var(--color-mint)',
              fontSize: 12,
              fontWeight: 540,
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: 0.55,
            }}
            title="Action shortcuts work once we have AI insights generated for you."
          >
            {cta} <ArrowIcon size={11} color="var(--color-mint)" />
          </div>
        )
      )}
    </div>
  );
}
