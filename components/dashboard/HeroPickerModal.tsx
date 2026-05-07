'use client';

import { useEffect } from 'react';
import { formatCurrency } from '@/lib/format';
import type { HeroId } from '@/lib/dashboard-layout';
import type { HeroData } from './Hero';

type HeroOption = {
  id: HeroId;
  name: string;
  description: string;
};

const HERO_OPTIONS: HeroOption[] = [
  {
    id: 'networth',
    name: 'Net worth',
    description: 'Assets minus debts, in one line. The default home anchor.',
  },
  {
    id: 'cash',
    name: 'Cash on hand',
    description: 'Liquid balance across checking and savings. Best when cash position is your focus.',
  },
  {
    id: 'investable',
    name: 'Investable assets',
    description: 'Brokerage, retirement, crypto. Best when growth is the story you watch.',
  },
  {
    id: 'debt',
    name: 'Debt total',
    description: 'Total revolving balance. Best when paying off debt is the focus right now.',
  },
  {
    id: 'cashflow',
    name: 'Monthly cash flow',
    description: 'Income minus expenses, month to date. Best for tight months.',
  },
];

type Props = {
  open: boolean;
  current: HeroId;
  data: HeroData;
  onClose: () => void;
  onPick: (id: HeroId) => void;
};

const fmt = (n: number) => formatCurrency(n, { maximumFractionDigits: 0 });

function valueForOption(id: HeroId, data: HeroData): string {
  switch (id) {
    case 'networth':   return fmt(data.netWorth);
    case 'cash':       return fmt(data.cash);
    case 'investable': return fmt(data.investable);
    case 'debt':       return fmt(data.debt);
    case 'cashflow':   return data.monthlyCashFlow >= 0 ? `+${fmt(data.monthlyCashFlow)}` : fmt(data.monthlyCashFlow);
  }
}

export function HeroPickerModal({ open, current, data, onClose, onPick }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 24px',
        overflow: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(820px, 100%)',
          background: 'var(--color-bg-1)',
          border: '1px solid var(--color-line-2)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px 24px 26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
              Choose your hero metric
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-dim)', marginTop: 2 }}>
              The one number that anchors your home. Beacon will narrate it for you.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {HERO_OPTIONS.map((opt) => {
            const isCurrent = opt.id === current;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onPick(opt.id);
                  onClose();
                }}
                style={{
                  background: isCurrent
                    ? 'color-mix(in oklab, var(--color-mint) 8%, var(--color-bg-2))'
                    : 'var(--color-bg-2)',
                  border: `1px solid ${isCurrent ? 'var(--color-mint)' : 'var(--color-line)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-sans)',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div
                  style={{
                    background: 'var(--color-bg-1)',
                    border: '1px solid var(--color-line)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 10,
                    height: 80,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: 0.5,
                      color: 'var(--color-text-dim)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {opt.name}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.4 }}>
                    {valueForOption(opt.id, data)}
                  </div>
                  <svg width="100%" height="24" viewBox="0 0 200 30" preserveAspectRatio="none" style={{ flex: 1 }}>
                    <path
                      d="M0 25 L20 20 L40 22 L60 15 L80 12 L100 8 L120 10 L140 6 L160 4 L180 3 L200 2"
                      fill="none"
                      stroke={isCurrent ? 'var(--color-mint)' : 'var(--color-indigo)'}
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      {opt.name}
                    </div>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                          color: 'var(--color-mint-ink)',
                          background: 'var(--color-mint)',
                          borderRadius: 999,
                          padding: '2px 6px',
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                    {opt.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
