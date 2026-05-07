'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BBtn, ArrowIcon, SparkleIcon } from '@/components/ui';

type Goal = { name: string; type: string };

type AuditData = {
  firstName: string | null;
  netWorth: number;
  accountCount: number;
  debtTotal: number;
  goals: Goal[];
  riskTolerance: number | null;
};

type FindingTag = 'WIN' | 'FIX' | 'PLAN';

type Finding = {
  tag: FindingTag;
  title: string;
  body: string;
  impact: string;
};

const TAG_COLOR: Record<FindingTag, string> = {
  WIN: 'var(--color-mint)',
  FIX: 'var(--color-warn)',
  PLAN: 'var(--color-indigo)',
};

const RISK_LABELS: Record<number, string> = {
  1: 'Conservative',
  2: 'Moderately conservative',
  3: 'Balanced',
  4: 'Growth',
  5: 'Aggressive',
};

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function buildFindings(data: AuditData): Finding[] {
  const findings: Finding[] = [];

  if (data.accountCount > 0) {
    findings.push({
      tag: 'WIN',
      title: 'Accounts connected',
      body: `Beacon now has a complete picture of your finances across ${data.accountCount} account${data.accountCount === 1 ? '' : 's'}. Real-time balance tracking is on.`,
      impact: `${data.accountCount} linked`,
    });
  }

  if (data.goals.length > 0) {
    const goalNames = data.goals.slice(0, 2).map((g) => g.name).join(' and ');
    findings.push({
      tag: 'PLAN',
      title: `Goals set: ${goalNames}${data.goals.length > 2 ? ` +${data.goals.length - 2} more` : ''}`,
      body: 'Beacon will shape every recommendation around these. Contribution targets and timelines arrive on your dashboard.',
      impact: `${data.goals.length} goal${data.goals.length === 1 ? '' : 's'}`,
    });
  }

  findings.push({
    tag: 'PLAN',
    title: 'Ask Beacon anything, any time',
    body: 'Chat lives in the top right of every screen. Your full financial picture is its context. Try: "How much could I put toward my house goal this month?"',
    impact: 'Always on',
  });

  return findings.slice(0, 3);
}

type Props = {
  data: AuditData;
};

export function AuditStep({ data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [context, setContext] = useState('');

  const findings = buildFindings(data);

  function finish() {
    startTransition(async () => {
      await fetch('/api/onboard', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: 6, onboardingContext: context.trim() || undefined }),
      });
      router.push('/');
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 600, width: '100%' }}>
      {/* Metric cards */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}
      >
        <div
          style={{
            background: 'var(--color-bg-2)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-dim)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Net worth
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: -0.8,
              color: data.netWorth >= 0 ? 'var(--color-text)' : 'var(--color-warn)',
            }}
          >
            {fmt(data.netWorth)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {data.accountCount} account{data.accountCount === 1 ? '' : 's'}
            {data.debtTotal > 0 ? ` · ${fmt(data.debtTotal)} in debt` : ''}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-2)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-dim)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Risk profile
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: -0.8,
              color: 'var(--color-mint)',
            }}
          >
            {data.riskTolerance ? RISK_LABELS[data.riskTolerance] ?? '—' : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {data.goals.length} goal{data.goals.length === 1 ? '' : 's'} set
          </div>
        </div>
      </div>

      {/* Findings */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-text-dim)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {findings.length} things to act on first
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {findings.map((f, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-bg-2)',
              border: '1px solid var(--color-line)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1,
                fontFamily: 'var(--font-mono)',
                color: TAG_COLOR[f.tag],
                padding: '4px 8px',
                borderRadius: 4,
                background: `color-mix(in oklab, ${TAG_COLOR[f.tag]} 15%, transparent)`,
                flexShrink: 0,
                alignSelf: 'flex-start',
                marginTop: 2,
              }}
            >
              {f.tag}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 540, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{f.body}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  color: TAG_COLOR[f.tag],
                  fontWeight: 540,
                }}
              >
                {f.impact}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--color-text-dim)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 0.4,
                  marginTop: 2,
                }}
              >
                IMPACT
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Context input */}
      <div
        style={{
          marginBottom: 16,
          padding: '12px 14px',
          background: 'var(--color-bg-2)',
          border: '1px solid var(--color-line)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-dim)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Anything Beacon should know?
        </div>
        <textarea
          placeholder="e.g. inheritance coming next year, planning to switch jobs, starting a business..."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'var(--color-text)',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.55,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* AI hint */}
      <div
        style={{
          marginBottom: 24,
          padding: 14,
          background: 'color-mix(in oklab, var(--color-indigo) 6%, transparent)',
          border: '1px solid color-mix(in oklab, var(--color-indigo) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <SparkleIcon size={16} color="var(--color-indigo)" />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-muted)' }}>
          I can help you act on any of this. Just ask in chat once you are inside.
        </div>
      </div>

      <BBtn
        variant="primary"
        size="lg"
        onClick={finish}
        disabled={isPending}
        trailing={<ArrowIcon size={16} color="var(--color-mint-ink)" />}
      >
        {isPending ? 'Opening…' : 'Open my dashboard'}
      </BBtn>
    </div>
  );
}
