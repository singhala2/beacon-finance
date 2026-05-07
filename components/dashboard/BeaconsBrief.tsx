'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SparkleIcon, Eyebrow } from '@/components/ui';
import { BriefCard } from './BriefCard';
import type { Brief } from '@/lib/insights';

type Props = {
  briefs: Brief[];
};

export function BeaconsBrief({ briefs: initial }: Props) {
  const router = useRouter();
  const [briefs, setBriefs] = useState<Brief[]>(initial);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (briefs.length === 0 && !refreshing) return null;

  function dismiss(id: string) {
    setBriefs((prev) => prev.filter((b) => b.id !== id));
    fetch(`/api/insights/${id}/dismiss`, { method: 'POST' }).catch(() => {
      // Best-effort — if it fails the insight will reappear on next reload
    });
  }

  function refresh() {
    setError(null);
    startRefresh(async () => {
      const res = await fetch('/api/insights', { method: 'POST' });
      const body = (await res.json().catch(() => null)) as
        | { ok: true; insights: Array<{ id: string; severity: string; headline: string; body: string }> }
        | { error: string }
        | null;
      if (!res.ok || !body || 'error' in body) {
        setError((body && 'error' in body && body.error) || 'Could not refresh insights.');
        return;
      }
      setBriefs(
        body.insights.map((i) => ({
          id: i.id,
          tag: severityToTag(i.severity),
          title: i.headline,
          body: i.body,
          cta: 'Discuss in chat',
          score: 0,
        })),
      );
      router.refresh();
    });
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <SparkleIcon size={14} color="var(--color-indigo)" />
        <Eyebrow>Beacon&apos;s brief · today</Eyebrow>
        <div style={{ flex: 1 }} />
        <button
          onClick={refresh}
          disabled={refreshing}
          title="Regenerate from your latest data"
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            color: 'var(--color-text-dim)',
            background: 'transparent',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            cursor: refreshing ? 'wait' : 'pointer',
          }}
        >
          {refreshing ? 'refreshing…' : 'refresh'}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 8,
            padding: '6px 10px',
            background: 'color-mix(in oklab, var(--color-warn) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--color-warn) 30%, transparent)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: 'var(--color-text-muted)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {briefs.map((b, i) => (
          <BriefCard
            key={b.id ?? i}
            id={b.id}
            tag={b.tag}
            title={b.title}
            body={b.body}
            cta={b.cta}
            onDismiss={b.id ? () => dismiss(b.id!) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function severityToTag(severity: string): Brief['tag'] {
  if (severity === 'opportunity') return 'WIN';
  if (severity === 'attention') return 'WATCH';
  return 'PLAN';
}
