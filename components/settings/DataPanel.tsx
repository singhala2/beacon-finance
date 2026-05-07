'use client';

import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { BBtn, BInput, Eyebrow } from '@/components/ui';
import { Card } from '@/components/dashboard/Card';

const DELETE_PHRASE = 'delete my account';

export function DataPanel() {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function deleteAccount() {
    if (phrase.trim().toLowerCase() !== DELETE_PHRASE) {
      setError(`Type "${DELETE_PHRASE}" to confirm.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/me', { method: 'DELETE' });
      if (!res.ok) {
        setError('Could not delete account. Try again.');
        return;
      }
      // Sign out (clears the now-orphaned session cookie) and head home.
      await signOut({ callbackUrl: '/welcome' });
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Card>
        <Eyebrow style={{ marginBottom: 6 }}>Export your data</Eyebrow>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
          Download a JSON file with everything Beacon has on file: accounts, holdings, transactions, goals, conversations, insights. Plaid access tokens are excluded for security.
        </div>
        <a href="/api/me/export" download>
          <BBtn variant="ghost" size="md">
            Download export
          </BBtn>
        </a>
      </Card>

      <Card
        style={{
          background: 'color-mix(in oklab, var(--color-warn) 5%, var(--color-bg-2))',
          border: '1px solid color-mix(in oklab, var(--color-warn) 30%, transparent)',
        }}
      >
        <Eyebrow color="var(--color-warn)" style={{ marginBottom: 6 }}>
          Delete account
        </Eyebrow>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
          Removes your profile, all connected accounts, all goals, and every conversation. Cannot be undone. Plaid items are revoked first so you stop incurring API calls.
        </div>

        {confirmingDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Eyebrow>Type "{DELETE_PHRASE}" to confirm</Eyebrow>
            <BInput value={phrase} onChange={setPhrase} placeholder={DELETE_PHRASE} />
            {error && <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <BBtn variant="primary" size="md" onClick={deleteAccount} disabled={isPending}>
                {isPending ? 'Deleting…' : 'Delete account'}
              </BBtn>
              <BBtn
                variant="ghost"
                size="md"
                onClick={() => {
                  setConfirmingDelete(false);
                  setPhrase('');
                  setError(null);
                }}
                disabled={isPending}
              >
                Cancel
              </BBtn>
            </div>
          </div>
        ) : (
          <BBtn variant="ghost" size="md" onClick={() => setConfirmingDelete(true)}>
            Delete account
          </BBtn>
        )}
      </Card>
    </div>
  );
}
