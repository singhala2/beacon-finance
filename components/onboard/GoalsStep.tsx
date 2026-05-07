'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BBtn,
  ArrowIcon,
  CheckIcon,
  HomeIcon,
  RetireIcon,
  EmergencyIcon,
  TravelIcon,
  PlusIcon,
  BChatBubble,
} from '@/components/ui';
import { advanceOnboardingStep } from '@/lib/onboard-client';

type GoalType = 'emergency' | 'house' | 'retirement' | 'debt' | 'travel' | 'custom';

type GoalTemplate = {
  type: GoalType;
  label: string;
  meta: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

const TEMPLATES: GoalTemplate[] = [
  { type: 'house',       label: 'Buy a house',             meta: 'in 10 years · $120k down',   Icon: HomeIcon },
  { type: 'retirement',  label: 'Comfortable retirement',  meta: 'in 40 years · $2.4M target', Icon: RetireIcon },
  { type: 'emergency',   label: 'Emergency fund',          meta: '6 months runway · $24k',      Icon: EmergencyIcon },
  { type: 'travel',      label: 'Travel and experiences',  meta: 'ongoing · $5k/yr',            Icon: TravelIcon },
];

export function GoalsStep() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<GoalType>>(
    new Set(['house', 'retirement', 'emergency']),
  );
  const [customText, setCustomText] = useState('');

  function toggle(type: GoalType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function advance() {
    startTransition(async () => {
      const goals: { name: string; type: GoalType }[] = TEMPLATES.filter((t) =>
        selected.has(t.type),
      ).map((t) => ({ name: t.label, type: t.type }));

      if (customText.trim()) {
        goals.push({ name: customText.trim(), type: 'custom' });
      }

      if (goals.length > 0) {
        await fetch('/api/goals', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ goals }),
        });
      }

      await advanceOnboardingStep(4);
      router.push('/onboard/5');
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 540, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <BChatBubble role="beacon">
        Now the fun part. Pick the ones that resonate, and we will dial in the numbers together.
      </BChatBubble>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {TEMPLATES.map((g) => {
          const isOn = selected.has(g.type);
          return (
            <button
              key={g.type}
              onClick={() => toggle(g.type)}
              style={{
                background: isOn
                  ? 'color-mix(in oklab, var(--color-mint) 8%, transparent)'
                  : 'var(--color-bg-2)',
                border: `1px solid ${isOn ? 'var(--color-mint)' : 'var(--color-line)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '13px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: isOn
                    ? 'color-mix(in oklab, var(--color-mint) 15%, transparent)'
                    : 'var(--color-bg-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <g.Icon size={18} color={isOn ? 'var(--color-mint)' : 'var(--color-text-muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 540, color: 'var(--color-text)' }}>{g.label}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-dim)',
                    marginTop: 2,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {g.meta}
                </div>
              </div>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: isOn ? 'var(--color-mint)' : 'transparent',
                  border: isOn ? 'none' : '1px solid var(--color-line-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isOn && <CheckIcon size={12} color="var(--color-mint-ink)" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom goal input */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--color-bg-2)',
          border: '1px dashed var(--color-line-2)',
          borderRadius: 'var(--radius-md)',
          padding: '0 14px',
          height: 46,
        }}
      >
        <PlusIcon size={14} color="var(--color-text-muted)" />
        <input
          placeholder="Describe a custom goal (e.g. sabbatical year in 2030)"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text)',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
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
    </div>
  );
}
