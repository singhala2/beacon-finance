'use client';

import { useEffect, useState } from 'react';
import { Sparkline } from '@/components/ui';

type Feature = {
  eyebrow: string;
  title: string;
  body: string;
  color: string;
  data: number[];
};

const FEATURES: Feature[] = [
  {
    eyebrow: '01 · UNIFIED VIEW',
    title: 'See all your money in one place.',
    body: 'Every checking, brokerage, retirement, debt and credit account. One live picture.',
    color: 'var(--color-mint)',
    data: [18200, 18450, 18100, 18750, 19200, 18900, 19400, 19800, 19650, 20100, 20400, 20517],
  },
  {
    eyebrow: '02 · SMART SUGGESTIONS',
    title: 'Stop leaving money on the table.',
    body: "Beacon spots wins your bank won't: match gaps, idle cash, duplicate subscriptions.",
    color: 'var(--color-indigo)',
    data: [820, 900, 960, 880, 1040, 1120, 1060, 1200, 1180, 1320, 1400, 1560],
  },
  {
    eyebrow: '03 · GOAL PLANNING',
    title: 'Build toward your goals automatically.',
    body: 'Set a target. Beacon figures out the contributions, timeline, and adjusts as life changes.',
    color: 'var(--color-mint)',
    data: [0, 400, 800, 1300, 2100, 2800, 3600, 4500, 5600, 7000, 8800, 11400],
  },
  {
    eyebrow: '04 · AI COPILOT',
    title: 'Ask anything about your money.',
    body: 'Should I refinance? Am I on track? What if I took a sabbatical? Beacon knows.',
    color: 'var(--color-indigo)',
    data: [42, 56, 61, 58, 72, 78, 80, 84, 88, 90, 92, 94],
  },
];

export function Showcase() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % FEATURES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const f = FEATURES[idx]!;

  return (
    <div
      style={{
        width: 540,
        flexShrink: 0,
        background: 'var(--color-bg-1)',
        padding: '40px 44px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        {FEATURES.map((feat, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: i === idx ? 1 : 0,
              transform: i === idx ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity .35s, transform .35s',
              pointerEvents: i === idx ? 'auto' : 'none',
            }}
          >
            <div style={{ width: '100%', maxWidth: 380 }}>
              <div
                style={{
                  background: 'var(--color-bg-2)',
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: 0.5,
                    color: 'var(--color-text-dim)',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {feat.eyebrow.split('·')[1]?.trim()}
                </div>
                <Sparkline data={feat.data} color={feat.color} height={90} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ paddingTop: 24, minHeight: 110 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-mint)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.6,
            marginBottom: 8,
          }}
        >
          {f.eyebrow}
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: -0.5,
            lineHeight: 1.2,
            margin: '0 0 8px',
            color: 'var(--color-text)',
          }}
        >
          {f.title}
        </h2>
        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          {f.body}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 16, alignItems: 'center' }}>
        {FEATURES.map((_, i) => (
          <button
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Show feature ${i + 1}`}
            style={{
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              height: 3,
              width: i === idx ? 36 : 14,
              borderRadius: 2,
              background: i === idx ? 'var(--color-mint)' : 'var(--color-line-2)',
              transition: 'width .3s, background .3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
