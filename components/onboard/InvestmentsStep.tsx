'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlaidLinkButton, type ConnectedAccount } from '@/components/plaid/PlaidLinkButton';
import { BBtn, ArrowIcon, CheckIcon, SparkleIcon } from '@/components/ui';

type Props = {
  initial: ConnectedAccount[];
};

type InvestmentAccount = ConnectedAccount & { selected: boolean };

function fmt(n: number | null, currency = 'USD'): string {
  if (n === null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

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
      await fetch('/api/onboard', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: 3 }),
      });
      router.push('/onboard/4');
      router.refresh();
    });
  }

  const plaidBtnStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  };

  return (
    <div style={{ maxWidth: 540, width: '100%' }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: -0.7,
          margin: '0 0 6px',
          lineHeight: 1.15,
        }}
      >
        Investments and retirement
      </h1>
      <p style={{ color: 'var(--color-text-muted)', margin: '0 0 20px', fontSize: 15, lineHeight: 1.55 }}>
        {isConnected ? 'Select the accounts to include.' : 'Connect each institution you invest with.'}
      </p>

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
                {fmt(a.balanceCurrent, a.currency)}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-dim)' }}>
                {a.name}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Empty state: prominent Plaid connect */
        <div
          style={{
            background: 'linear-gradient(180deg, var(--color-bg-2), var(--color-bg-1))',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 22px',
            marginBottom: 14,
          }}
        >
          <PlaidLinkButton onSuccess={handlePlaidSuccess} style={plaidBtnStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 11,
                  background: 'var(--color-bg-3)',
                  border: '1px solid var(--color-line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 0.6,
                  flexShrink: 0,
                }}
              >
                plaid
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Connect investment accounts</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  Fidelity, Vanguard, Schwab, Robinhood, Coinbase...
                </div>
              </div>
            </div>
          </PlaidLinkButton>
        </div>
      )}

      {/* Add another institution when already connected */}
      {isConnected && (
        <div style={{ marginBottom: 14 }}>
          <PlaidLinkButton onSuccess={handlePlaidSuccess} style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
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

      {/* AI insight hint — shown when connected */}
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

      {!isConnected && (
        <div style={{ height: 22 }} />
      )}

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
