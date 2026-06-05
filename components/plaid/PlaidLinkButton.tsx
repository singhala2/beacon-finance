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
  // When true, after the user completes the real Plaid Link flow we discard
  // Plaid's public_token and substitute one generated from our recent-grad
  // persona via /api/plaid/sandbox-seed. The Plaid Link UI still opens (for
  // demo credibility), but the resulting data is the persona.
  sandboxPersonaSwap?: boolean;
};

export function PlaidLinkButton({ onSuccess, children, style, disabled, sandboxPersonaSwap }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = useCallback(
    async (
      linkPublicToken: string,
      metadata: { institution?: { institution_id?: string; name?: string } | null },
    ) => {
      setError(null);

      let publicToken = linkPublicToken;
      let institutionId = metadata.institution?.institution_id;
      let institutionName = metadata.institution?.name;

      // Swap the Plaid Link result for our persona in sandbox-demo mode.
      if (sandboxPersonaSwap) {
        const seedRes = await fetch('/api/plaid/sandbox-seed', { method: 'POST' });
        const seedData = (await seedRes.json().catch(() => ({}))) as {
          ok?: boolean;
          publicToken?: string;
          institutionId?: string;
          institutionName?: string;
          error?: string;
        };
        if (!seedRes.ok || !seedData.ok || !seedData.publicToken) {
          setError(seedData.error ?? 'Failed to load demo persona.');
          return;
        }
        publicToken = seedData.publicToken;
        institutionId = seedData.institutionId ?? institutionId;
        institutionName = seedData.institutionName ?? institutionName;
      }

      const res = await fetch('/api/plaid/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publicToken, institutionId, institutionName }),
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

      // After exchange completes, override transactions with the persona's
      // deterministic spending pattern (Plaid's sync is flaky for custom users).
      if (sandboxPersonaSwap) {
        await fetch('/api/plaid/sandbox-finalize-persona', { method: 'POST' }).catch(() => {});
      }

      onSuccess(data.accounts ?? []);
    },
    [onSuccess, sandboxPersonaSwap],
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
