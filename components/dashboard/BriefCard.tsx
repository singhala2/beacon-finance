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
};

export function BriefCard({ tag, title, body, cta }: Props) {
  const color = TAG_COLOR[tag];
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
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>{body}</div>
      {cta && (
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
          title="Action shortcuts arrive in Phase 5."
        >
          {cta} <ArrowIcon size={11} color="var(--color-mint)" />
        </div>
      )}
    </div>
  );
}
