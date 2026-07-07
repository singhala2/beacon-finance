'use client';

// Phase 8 (8C) — the confirmation queue. Every non-system fact is provisional
// until the user confirms it. Each row shows the fact next to the source snippet
// it came from, and lets the user confirm, correct, or reject it.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BBtn } from '@/components/ui';
import { Card } from '@/components/dashboard/Card';

export type QueueItem = {
  id: string;
  label: string;
  domainLabel: string;
  displayValue: string;
  editValue: string;
  valueType: string;
  sourceLabel: string;
  evidence: string | null;
  confidence: number | null;
};

type RowState = 'idle' | 'editing' | 'busy' | 'error';

function Row({ item, onResolved }: { item: QueueItem; onResolved: (id: string) => void }) {
  const [state, setState] = useState<RowState>('idle');
  const [draft, setDraft] = useState(item.editValue);
  const [error, setError] = useState('');

  async function act(action: 'confirm' | 'reject', value?: string) {
    setState('busy');
    setError('');
    try {
      const res = await fetch(`/api/knowledge/facts/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(value !== undefined ? { value } : {}) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not save. Try again.');
        setState('error');
        return;
      }
      onResolved(item.id);
    } catch {
      setError('Something went wrong. Try again.');
      setState('error');
    }
  }

  const busy = state === 'busy';

  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid var(--color-line)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
            {item.domainLabel}
          </div>
          <div style={{ fontSize: 14, fontWeight: 540, color: 'var(--color-text)' }}>{item.label}</div>

          {state === 'editing' ? (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              style={{
                marginTop: 6,
                width: '100%',
                maxWidth: 260,
                height: 38,
                padding: '0 12px',
                background: 'var(--color-bg-4)',
                border: '1px solid var(--color-line-2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
          ) : (
            <div style={{ marginTop: 4, fontSize: 16, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
              {item.displayValue}
            </div>
          )}

          {item.evidence && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: 'var(--color-text-muted)',
                borderLeft: '2px solid var(--color-line-2)',
                paddingLeft: 8,
                fontStyle: 'italic',
              }}
            >
              &ldquo;{item.evidence}&rdquo;
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
            {item.sourceLabel}
            {item.confidence !== null ? ` · ${Math.round(item.confidence * 100)}% confidence` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {state === 'editing' ? (
            <>
              <BBtn size="sm" onClick={() => act('confirm', draft)} disabled={busy}>Save</BBtn>
              <BBtn size="sm" variant="ghost" onClick={() => setState('idle')} disabled={busy}>Cancel</BBtn>
            </>
          ) : (
            <>
              <BBtn size="sm" onClick={() => act('confirm')} disabled={busy}>Confirm</BBtn>
              <BBtn size="sm" variant="outline" onClick={() => setState('editing')} disabled={busy}>Edit</BBtn>
              <BBtn size="sm" variant="ghost" onClick={() => act('reject')} disabled={busy}>Reject</BBtn>
            </>
          )}
        </div>
      </div>
      {state === 'error' && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-warn)' }}>{error}</div>}
    </div>
  );
}

export function ConfirmationQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const remaining = items.filter((i) => !resolved.has(i.id));

  function onResolved(id: string) {
    setResolved((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Refresh so counts elsewhere (nav, Hub) stay in sync.
    router.refresh();
  }

  if (remaining.length === 0) {
    return (
      <Card>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)', padding: '4px 0' }}>
          Nothing left to review. New facts show up here as you add documents or tell Beacon things in chat.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 }}>
        {remaining.length} fact{remaining.length === 1 ? '' : 's'} to review. Confirm what looks right, fix what does not.
      </div>
      {remaining.map((item) => (
        <Row key={item.id} item={item} onResolved={onResolved} />
      ))}
    </Card>
  );
}
