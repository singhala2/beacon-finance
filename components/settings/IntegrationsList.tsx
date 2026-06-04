'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BBtn } from '@/components/ui';
import { Card } from '@/components/dashboard/Card';
import { PlaidLinkButton } from '@/components/plaid/PlaidLinkButton';
import { formatSyncedAgo } from '@/lib/dashboard';

type Item = {
  id: string;
  institutionName: string | null;
  status: string;
  accountCount: number;
  lastSyncedAt: Date | null;
  updatedAt: Date;
};

type Props = {
  items: Item[];
};

export function IntegrationsList({ items }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function disconnect(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/plaid/item/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Could not disconnect. Try again.');
        return;
      }
      setConfirming(null);
      router.refresh();
    });
  }

  const connectButton = (
    <PlaidLinkButton
      onSuccess={() => window.location.reload()}
      style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <div
        style={{
          width: '100%',
          border: '1px dashed var(--color-line-2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: 13,
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}
      >
        + Connect another institution
      </div>
    </PlaidLinkButton>
  );

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            padding: 32,
            background: 'var(--color-bg-2)',
            border: '1px dashed var(--color-line-2)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          No institutions connected.
        </div>
        {connectButton}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>{error}</div>}
      {items.map((it) => {
        const isConfirming = confirming === it.id;
        return (
          <Card key={it.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                  {it.institutionName ?? 'Unknown institution'}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-dim)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: 2,
                  }}
                >
                  {it.accountCount} account{it.accountCount === 1 ? '' : 's'} ·{' '}
                  {it.lastSyncedAt
                    ? `last sync ${formatSyncedAgo(it.lastSyncedAt)}`
                    : 'never synced'}
                </div>
              </div>
              {isConfirming ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <BBtn variant="primary" size="md" onClick={() => disconnect(it.id)} disabled={isPending}>
                    {isPending ? 'Disconnecting…' : 'Confirm'}
                  </BBtn>
                  <BBtn variant="ghost" size="md" onClick={() => setConfirming(null)} disabled={isPending}>
                    Cancel
                  </BBtn>
                </div>
              ) : (
                <BBtn variant="ghost" size="md" onClick={() => setConfirming(it.id)}>
                  Disconnect
                </BBtn>
              )}
            </div>
          </Card>
        );
      })}
      {connectButton}
    </div>
  );
}
