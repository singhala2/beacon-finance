'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BBtn, BInput, Eyebrow } from '@/components/ui';

type Props = {
  accountId: string;
  plaidItemId: string | null;
  initialName: string;
  initialHidden: boolean;
  institutionName: string;
};

export function AccountControls({
  accountId,
  plaidItemId,
  initialName,
  initialHidden,
  institutionName,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [hidden, setHidden] = useState(initialHidden);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [isPending, startTransition] = useTransition();

  function saveName() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customName: name.trim() || null }),
      });
      if (!res.ok) {
        setError('Could not save name. Try again.');
        return;
      }
      router.refresh();
    });
  }

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isHidden: next }),
      });
      if (!res.ok) {
        setHidden(!next); // revert
        setError('Could not update visibility.');
        return;
      }
      router.refresh();
    });
  }

  function disconnect() {
    if (!plaidItemId) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/plaid/item/${plaidItemId}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Could not disconnect. Try again.');
        return;
      }
      router.push('/accounts');
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Rename */}
      <div>
        <Eyebrow style={{ marginBottom: 6 }}>Display name</Eyebrow>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <BInput value={name} onChange={setName} placeholder="Custom name" />
          <BBtn variant="primary" size="md" onClick={saveName} disabled={isPending}>
            Save
          </BBtn>
        </div>
      </div>

      {/* Hide / show */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow style={{ marginBottom: 4 }}>Visibility</Eyebrow>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {hidden
              ? 'Hidden. This account is excluded from your dashboard sums.'
              : 'Visible. Counts toward net worth and dashboard cards.'}
          </div>
        </div>
        <BBtn variant="ghost" size="md" onClick={toggleHidden} disabled={isPending}>
          {hidden ? 'Show' : 'Hide'}
        </BBtn>
      </div>

      {/* Disconnect */}
      {plaidItemId && (
        <div
          style={{
            padding: 14,
            background: 'color-mix(in oklab, var(--color-warn) 6%, transparent)',
            border: '1px solid color-mix(in oklab, var(--color-warn) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Eyebrow color="var(--color-warn)" style={{ marginBottom: 6 }}>
            Disconnect institution
          </Eyebrow>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            This removes <strong style={{ color: 'var(--color-text)' }}>every</strong> account under {institutionName}, along with its transactions and holdings. You can reconnect later from settings.
          </div>
          {confirmingDisconnect ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <BBtn variant="primary" size="md" onClick={disconnect} disabled={isPending}>
                {isPending ? 'Disconnecting…' : `Yes, disconnect ${institutionName}`}
              </BBtn>
              <BBtn variant="ghost" size="md" onClick={() => setConfirmingDisconnect(false)} disabled={isPending}>
                Cancel
              </BBtn>
            </div>
          ) : (
            <BBtn variant="ghost" size="md" onClick={() => setConfirmingDisconnect(true)} disabled={isPending}>
              Disconnect {institutionName}
            </BBtn>
          )}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>{error}</div>
      )}
    </div>
  );
}
