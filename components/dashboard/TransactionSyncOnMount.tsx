'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Fires a one-shot transaction sync as soon as the dashboard mounts. Used when
// the user has connected accounts but no transactions yet (first dashboard
// load after onboarding, or a fresh sandbox session). Refreshes the route
// after the sync so cards re-render with the new data.
export function TransactionSyncOnMount() {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch('/api/plaid/sync', { method: 'POST' })
      .then((res) => res.json())
      .then((data: { ok?: boolean; added?: number }) => {
        if (data.ok && (data.added ?? 0) > 0) {
          router.refresh();
        }
      })
      .catch((err) => {
        console.error('Background transaction sync failed', err);
      });
  }, [router]);

  return null;
}
