'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export type ConnectedAccount = {
  id: string;
  institution: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  balanceCurrent: number | null;
  balanceAvailable: number | null;
  currency: string;
};

type Props = {
  onSuccess: (accounts: ConnectedAccount[]) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  disabled?: boolean;
};

export function PlaidLinkButton({ onSuccess, children, style, disabled }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = useCallback(
    async (
      publicToken: string,
      metadata: { institution?: { institution_id?: string; name?: string } | null },
    ) => {
      setError(null);
      const res = await fetch('/api/plaid/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicToken,
          institutionId: metadata.institution?.institution_id,
          institutionName: metadata.institution?.name,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        accounts?: ConnectedAccount[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Failed to connect accounts.');
        return;
      }
      onSuccess(data.accounts ?? []);
    },
    [onSuccess],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handleSuccess,
    onExit: () => {
      setLinkToken(null);
      setPendingOpen(false);
    },
  });

  // Open Plaid Link as soon as the token is loaded and ready
  useEffect(() => {
    if (pendingOpen && ready && linkToken) {
      setPendingOpen(false);
      open();
    }
  }, [pendingOpen, ready, linkToken, open]);

  async function handleClick() {
    if (loading || disabled) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/plaid/link-token', { method: 'POST' });
      const data = (await res.json()) as { link_token?: string; error?: string };
      if (!res.ok || !data.link_token) {
        setError(data.error ?? 'Could not start connection. Try again.');
        return;
      }
      setLinkToken(data.link_token);
      setPendingOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading || disabled} style={style}>
        {loading ? 'Connecting…' : children}
      </button>
      {error && (
        <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
