'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BBtn, ArrowIcon, StepHeader } from '@/components/ui';
import { advanceOnboardingStep } from '@/lib/onboard-client';

type Level = {
  label: string;
  tag: string;
  description: string;
  stocks: number;
  bonds: number;
  cash: number;
};

const LEVELS: Level[] = [
  {
    label: 'Conservative',
    tag: '30/60',
    description:
      'Capital preservation is the priority. Mostly bonds and cash equivalents with modest equity exposure. Suited for short time horizons or low appetite for drawdowns.',
    stocks: 30,
    bonds: 60,
    cash: 10,
  },
  {
    label: 'Moderately conservative',
    tag: '50/40',
    description:
      'A slight tilt toward stability. Balanced between growth and income, with bonds cushioning volatility. Good for medium-term goals where you can tolerate some swings.',
    stocks: 50,
    bonds: 40,
    cash: 10,
  },
  {
    label: 'Balanced',
    tag: '60/30',
    description:
      'The classic 60/40 split. Enough equities to compound meaningfully, enough bonds to dampen the rough patches. A reasonable default for most long-term savers.',
    stocks: 60,
    bonds: 30,
    cash: 10,
  },
  {
    label: 'Growth',
    tag: '80/15',
    description:
      'Mostly equities, with a slice of bonds for stability. With a long runway, this gives compound growth without panic-level volatility. Beacon recommends this for most users under 40.',
    stocks: 80,
    bonds: 15,
    cash: 5,
  },
  {
    label: 'Aggressive',
    tag: '95/4',
    description:
      'Almost entirely equities. Maximizes long-run compounding but expect sharp drawdowns. Best when you have 15+ years and a strong stomach for short-term losses.',
    stocks: 95,
    bonds: 4,
    cash: 1,
  },
];

const BAR_HEIGHTS = [40, 56, 72, 96, 116];

type Props = {
  initial: number; // 1-5, 0 = not set
};

export function RiskStep({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Default to level 4 (Growth) if not set — matches prototype
  const [selected, setSelected] = useState(initial > 0 ? initial - 1 : 3);

  const level = LEVELS[selected];

  function advance() {
    startTransition(async () => {
      await advanceOnboardingStep(5, { riskTolerance: selected + 1 });
      router.push('/onboard/6');
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 540, width: '100%' }}>
      <StepHeader
        title="Risk preferences"
        body="Click to adjust. We will suggest a portfolio mix."
      />

      {/* Bar chart */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          height: 120,
          alignItems: 'flex-end',
          marginBottom: 10,
        }}
      >
        {BAR_HEIGHTS.map((h, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            style={{
              flex: 1,
              height: h,
              borderRadius: 8,
              cursor: 'pointer',
              background: i === selected ? 'var(--color-mint)' : 'var(--color-bg-3)',
              border: `1px solid ${i === selected ? 'var(--color-mint)' : 'var(--color-line)'}`,
              transition: 'background 0.2s, border-color 0.2s',
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.5,
          marginBottom: 24,
        }}
      >
        <span>CONSERVATIVE</span>
        <span>BALANCED</span>
        <span>AGGRESSIVE</span>
      </div>

      {/* Portfolio card */}
      <div
        style={{
          background: 'var(--color-bg-2)',
          border: '1px solid var(--color-mint)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          boxShadow:
            '0 0 0 1px color-mix(in oklab, var(--color-mint) 25%, transparent), 0 0 24px color-mix(in oklab, var(--color-mint) 15%, transparent)',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-mint)',
              fontWeight: 540,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {level.label} · {level.tag}
          </div>
          {selected === 3 && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-dim)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Recommended for you
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 14,
            color: 'var(--color-text)',
            lineHeight: 1.55,
            marginBottom: 16,
          }}
        >
          {level.description}
        </div>

        {/* Allocation bar */}
        <div
          style={{
            display: 'flex',
            gap: 3,
            height: 10,
            borderRadius: 5,
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <div style={{ flex: level.stocks, background: 'var(--color-mint)' }} />
          <div style={{ flex: level.bonds, background: 'var(--color-indigo)' }} />
          <div style={{ flex: level.cash, background: 'var(--color-bg-4)' }} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 14,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {[
            { v: `${level.stocks}%`, l: 'STOCKS', c: 'var(--color-mint)' },
            { v: `${level.bonds}%`, l: 'BONDS', c: 'var(--color-indigo)' },
            { v: `${level.cash}%`, l: 'CASH', c: 'var(--color-text-muted)' },
          ].map((x) => (
            <div key={x.l}>
              <div style={{ color: x.c, fontSize: 20, fontWeight: 600 }}>{x.v}</div>
              <div style={{ color: 'var(--color-text-dim)', fontSize: 10 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      <BBtn
        variant="primary"
        size="lg"
        onClick={advance}
        disabled={isPending}
        trailing={<ArrowIcon size={16} color="var(--color-mint-ink)" />}
      >
        {isPending ? 'Saving…' : 'Continue'}
      </BBtn>
    </div>
  );
}
