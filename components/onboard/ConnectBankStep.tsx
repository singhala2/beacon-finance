'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ConnectedAccount } from '@/components/plaid/PlaidLinkButton';
import { PlaidConnectCard } from '@/components/plaid/PlaidConnectCard';
import { BBtn, ArrowIcon, CheckIcon, SparkleIcon, PlusIcon, StepHeader } from '@/components/ui';
import { advanceOnboardingStep } from '@/lib/onboard-client';
import { formatCurrency } from '@/lib/format';

type Props = {
  initial: ConnectedAccount[];
  sandboxMode?: boolean;
};

function AccountRow({ a }: { a: ConnectedAccount }) {
  const balance = a.balanceCurrent;
  const isNegative = balance !== null && balance < 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 4px' }}>
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
        {formatCurrency(balance, { currency: a.currency })}
      </div>
      <CheckIcon size={14} color="var(--color-mint)" />
    </div>
  );
}

export function ConnectBankStep({ initial, sandboxMode = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(initial);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const bankAccounts = accounts.filter((a) => a.type === 'depository' || a.type === 'credit');
  const isConnected = bankAccounts.length > 0;

  function handlePlaidSuccess(newAccounts: ConnectedAccount[]) {
    const bankOnly = newAccounts.filter((a) => a.type === 'depository' || a.type === 'credit');
    setAccounts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      return [...prev, ...bankOnly.filter((a) => !existingIds.has(a.id))];
    });
  }

  async function seedDemoPersona() {
    setSeedError(null);
    setSeeding(true);
    try {
      // Step 1: ask Plaid Sandbox to create a public token whose data matches
      // the recent-grad persona. The endpoint also wipes existing items first.
      const seedRes = await fetch('/api/plaid/sandbox-seed', { method: 'POST' });
      const seedData = (await seedRes.json().catch(() => ({}))) as {
        ok?: boolean;
        publicToken?: string;
        institutionName?: string;
        institutionId?: string;
        error?: string;
      };
      if (!seedRes.ok || !seedData.ok || !seedData.publicToken) {
        setSeedError(seedData.error ?? 'Could not generate demo persona.');
        return;
      }

      // Step 2: exchange via the same endpoint Plaid Link uses, so persistence,
      // holdings fetch, and transaction sync all run end-to-end.
      const exchangeRes = await fetch('/api/plaid/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicToken: seedData.publicToken,
          institutionId: seedData.institutionId,
          institutionName: seedData.institutionName,
        }),
      });
      const exchangeData = (await exchangeRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!exchangeRes.ok || !exchangeData.ok) {
        setSeedError(exchangeData.error ?? 'Plaid exchange failed.');
        return;
      }

      window.location.reload();
    } finally {
      setSeeding(false);
    }
  }

  function advance() {
    startTransition(async () => {
      await advanceOnboardingStep(2);
      router.push('/onboard/3');
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 560, width: '100%' }}>
      <StepHeader
        title="Connect your accounts"
        body="Start with Plaid. It will pull everything it can find."
      />

      <div style={{ marginBottom: 12 }}>
        <PlaidConnectCard
          title="Connect with Plaid"
          subline={
            isConnected
              ? bankAccounts.map((a) => a.institution).join(' · ')
              : '12,000+ banks and brokerages supported'
          }
          badge={
            isConnected ? (
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
            ) : null
          }
          onSuccess={handlePlaidSuccess}
        >
          {isConnected ? bankAccounts.map((a) => <AccountRow key={a.id} a={a} />) : null}
        </PlaidConnectCard>
      </div>

      {sandboxMode && !isConnected && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={seedDemoPersona}
            disabled={seeding}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px dashed var(--color-mint)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--color-mint)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              cursor: seeding ? 'wait' : 'pointer',
            }}
          >
            <SparkleIcon size={14} color="var(--color-mint)" />
            {seeding ? 'Loading demo persona…' : 'Use demo persona (recent grad)'}
          </button>
          <p style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-dim)', textAlign: 'center' }}>
            Sandbox only. Wipes any existing connections and seeds 7 accounts with 90 days of synthetic data.
          </p>
          {seedError && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-danger)', textAlign: 'center' }}>
              {seedError}
            </div>
          )}
        </div>
      )}

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
