'use client';

// Phase 8 (8F) — manual entry. A suggestion chip that expands into a small
// input. Saving posts through the same commit path as documents and chat, so
// the fact lands pending for confirmation in the review queue.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddFactChip({ domain, factKey, label }: { domain: string; factKey: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/knowledge/facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, key: factKey, value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not save.');
        setBusy(false);
        return;
      }
      setOpen(false);
      setValue('');
      setBusy(false);
      router.refresh();
    } catch {
      setError('Something went wrong.');
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 26,
          padding: '0 10px',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          background: 'var(--color-bg-3)',
          border: '1px solid var(--color-line)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <span style={{ color: 'var(--color-text-dim)' }}>+</span>
        {label}
      </button>
    );
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={label}
          style={{
            height: 30,
            padding: '0 10px',
            width: 150,
            background: 'var(--color-bg-4)',
            border: '1px solid var(--color-line-2)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text)',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
        />
        <button
          onClick={save}
          disabled={busy || !value.trim()}
          style={{
            height: 30,
            padding: '0 10px',
            fontSize: 12,
            color: 'var(--color-mint-ink)',
            background: 'var(--color-mint)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: busy || !value.trim() ? 'default' : 'pointer',
            opacity: busy || !value.trim() ? 0.5 : 1,
          }}
        >
          {busy ? '…' : 'Save'}
        </button>
      </span>
      {error && <span style={{ fontSize: 11, color: 'var(--color-warn)' }}>{error}</span>}
    </span>
  );
}
