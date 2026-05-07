'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlaidLinkButton, type ConnectedAccount } from '@/components/plaid/PlaidLinkButton';
import { PlaidConnectCard } from '@/components/plaid/PlaidConnectCard';
import { BBtn, ArrowIcon, CheckIcon, SparkleIcon, StepHeader } from '@/components/ui';
import { advanceOnboardingStep } from '@/lib/onboard-client';
import { formatCurrency } from '@/lib/format';

type Props = {
  initial: ConnectedAccount[];
};

type InvestmentAccount = ConnectedAccount & { selected: boolean };

export function InvestmentsStep({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [accounts, setAccounts] = useState<InvestmentAccount[]>(
    initial.map((a) => ({ ...a, selected: true })),
  );

  const isConnected = accounts.length > 0;

  function toggleAccount(id: string) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)));
  }

  function handlePlaidSuccess(newAccounts: ConnectedAccount[]) {
    const investOnly = newAccounts.filter((a) => a.type === 'investment');
    setAccounts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const fresh = investOnly
        .filter((a) => !existingIds.has(a.id))
        .map((a) => ({ ...a, selected: true }));
      return [...prev, ...fresh];
    });
  }

  function advance() {
    startTransition(async () => {
      await advanceOnboardingStep(3);
      router.push('/onboard/4');
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 540, width: '100%' }}>
      <StepHeader
        title="Investments and retirement"
        body={isConnected ? 'Select the accounts to include.' : 'Connect each institution you invest with.'}
      />

      {isConnected ? (
        /* Connected state: show selectable cards */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: accounts.length === 1 ? '1fr' : '1fr 1fr',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => toggleAccount(a.id)}
              style={{
                background: a.selected
                  ? 'color-mix(in oklab, var(--color-mint) 6%, transparent)'
                  : 'var(--color-bg-2)',
                border: `1px solid ${a.selected ? 'var(--color-mint)' : 'var(--color-line)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 16,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    background: 'var(--color-bg-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  {a.institution[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 540 }}>{a.institution}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                    {a.subtype ?? a.type}
                    {a.mask ? ` · ${a.mask}` : ''}
                  </div>
                </div>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    background: a.selected ? 'var(--color-mint)' : 'transparent',
                    border: a.selected ? 'none' : '1px solid var(--color-line-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {a.selected && <CheckIcon size={11} color="var(--color-mint-ink)" />}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>
                {formatCurrency(a.balanceCurrent, {
                  currency: a.currency,
                  maximumFractionDigits: 0,
                })}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-dim)' }}>
                {a.name}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <PlaidConnectCard
            title="Connect investment accounts"
            subline="Fidelity, Vanguard, Schwab, Robinhood, Coinbase..."
            onSuccess={handlePlaidSuccess}
          />
        </div>
      )}

      {/* Add another institution when already connected */}
      {isConnected && (
        <div style={{ marginBottom: 14 }}>
          <PlaidLinkButton
            onSuccess={handlePlaidSuccess}
            style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div
              style={{
                width: '100%',
                border: '1px dashed var(--color-line-2)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              + Connect another institution
            </div>
          </PlaidLinkButton>
        </div>
      )}

      {isConnected && (
        <div
          style={{
            padding: 14,
            background: 'color-mix(in oklab, var(--color-indigo) 6%, transparent)',
            border: '1px solid color-mix(in oklab, var(--color-indigo) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            marginBottom: 22,
          }}
        >
          <SparkleIcon size={15} color="var(--color-indigo)" />
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--color-text)', fontWeight: 540 }}>Beacon is reviewing your portfolio.</span>{' '}
            Insights on allocation, fees, and match gaps will appear on your dashboard.
          </div>
        </div>
      )}

      {!isConnected && <div style={{ height: 22 }} />}

      <div style={{ display: 'flex', gap: 12 }}>
        <BBtn
          variant="primary"
          size="lg"
          onClick={advance}
          disabled={isPending}
          trailing={<ArrowIcon size={16} color="var(--color-mint-ink)" />}
        >
          {isPending ? 'Saving…' : 'Continue'}
        </BBtn>
        <BBtn variant="ghost" size="lg" onClick={advance} disabled={isPending}>
          Skip
        </BBtn>
      </div>
    </div>
  );
}
