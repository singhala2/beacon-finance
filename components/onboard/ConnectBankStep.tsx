'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlaidLinkButton, type ConnectedAccount } from '@/components/plaid/PlaidLinkButton';
import { BBtn, ArrowIcon, CheckIcon, SparkleIcon, PlusIcon } from '@/components/ui';

type Props = {
  initial: ConnectedAccount[];
};

type DisplayAccount = ConnectedAccount & { isNew?: boolean };

function fmt(n: number | null, currency = 'USD'): string {
  if (n === null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

function AccountRow({ a }: { a: DisplayAccount }) {
  const balance = a.balanceCurrent;
  const isNegative = balance !== null && balance < 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '7px 4px',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: 'var(--color-bg-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}
      >
        {a.institution[0]?.toUpperCase() ?? '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 540 }}>{a.institution}</span>
          <span style={{ fontSize: 11.5, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
            {a.subtype ?? a.type}
            {a.mask ? ` · ${a.mask}` : ''}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{a.name}</div>
      </div>
      <div
        style={{
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          color: isNegative ? 'var(--color-warn)' : 'var(--color-text)',
          flexShrink: 0,
        }}
      >
        {fmt(balance, a.currency)}
      </div>
      <CheckIcon size={14} color="var(--color-mint)" />
    </div>
  );
}

export function ConnectBankStep({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [accounts, setAccounts] = useState<DisplayAccount[]>(initial);

  const bankAccounts = accounts.filter((a) => a.type === 'depository' || a.type === 'credit');
  const isConnected = bankAccounts.length > 0;

  function handlePlaidSuccess(newAccounts: ConnectedAccount[]) {
    const bankOnly = newAccounts.filter((a) => a.type === 'depository' || a.type === 'credit');
    setAccounts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const fresh = bankOnly.filter((a) => !existingIds.has(a.id)).map((a) => ({ ...a, isNew: true }));
      return [...prev, ...fresh];
    });
  }

  function advance() {
    startTransition(async () => {
      await fetch('/api/onboard', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: 2 }),
      });
      router.push('/onboard/3');
      router.refresh();
    });
  }

  const plaidBtnStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  };

  return (
    <div style={{ maxWidth: 560, width: '100%' }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: -0.7,
          margin: '0 0 6px',
          lineHeight: 1.15,
        }}
      >
        Connect your accounts
      </h1>
      <p style={{ color: 'var(--color-text-muted)', margin: '0 0 22px', fontSize: 15, lineHeight: 1.55 }}>
        Start with Plaid. It will pull everything it can find.
      </p>

      {/* Plaid card */}
      <div
        style={{
          background: 'linear-gradient(180deg, var(--color-bg-2), var(--color-bg-1))',
          border: '1px solid var(--color-line)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 22px',
          marginBottom: 12,
        }}
      >
        <PlaidLinkButton onSuccess={handlePlaidSuccess} style={plaidBtnStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: isConnected ? 14 : 0 }}>
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
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Connect with Plaid</span>
                {isConnected && (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      letterSpacing: 0.6,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-mint)',
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: 'color-mix(in oklab, var(--color-mint) 15%, transparent)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {bankAccounts.length} {bankAccounts.length === 1 ? 'account' : 'accounts'} pulled
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-dim)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                {isConnected
                  ? bankAccounts.map((a) => a.institution).join(' · ')
                  : '12,000+ banks and brokerages supported'}
              </div>
            </div>
          </div>
        </PlaidLinkButton>

        {isConnected && (
          <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {bankAccounts.map((a) => (
              <AccountRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>

      {/* Manual add — deferred */}
      <button
        disabled
        title="Manual account entry is coming soon."
        style={{
          width: '100%',
          background: 'transparent',
          border: '1px dashed var(--color-line-2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: 'var(--color-text-dim)',
          fontSize: 14,
          cursor: 'not-allowed',
          marginBottom: 12,
          opacity: 0.6,
        }}
      >
        <PlusIcon size={14} color="var(--color-text-dim)" />
        Add an account manually
      </button>

      {/* Tip */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          padding: '12px 14px',
          background: 'color-mix(in oklab, var(--color-mint) 5%, transparent)',
          border: '1px solid color-mix(in oklab, var(--color-mint) 25%, transparent)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
          marginBottom: 22,
        }}
      >
        <SparkleIcon size={14} color="var(--color-mint)" />
        <div>
          <span style={{ color: 'var(--color-text)', fontWeight: 540 }}>Got something unusual?</span>{' '}
          Add custom accounts later: private equity, RSUs, real estate, or unsupported banks.
        </div>
      </div>

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
          Skip for now
        </BBtn>
      </div>
    </div>
  );
}
