'use client';

// Phase 8 (8B) — minimal upload affordance. Ships the working pipeline so
// extraction is testable. 8D replaces this with the domain-organized Hub; 8C
// adds the confirmation queue this links to.

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BBtn } from '@/components/ui';
import { Card, CardHeader } from '@/components/dashboard/Card';
import { DOCUMENT_TYPES } from '@/lib/knowledge/registry';

type Result =
  | { kind: 'ok'; committed: number; rejected: number; filename: string }
  | { kind: 'error'; message: string };

export function UploadCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState('auto');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit() {
    const file = inputRef.current?.files?.[0];
    if (!file || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (type !== 'auto') form.append('type', type);
      const res = await fetch('/api/knowledge/documents', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: 'error', message: data.error ?? 'Upload failed.' });
      } else {
        setResult({ kind: 'ok', committed: data.committed ?? 0, rejected: (data.rejected ?? []).length, filename: data.document?.filename ?? file.name });
        if (inputRef.current) inputRef.current.value = '';
        setFileName('');
        router.refresh();
      }
    } catch {
      setResult({ kind: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader eyebrow="Add a document" />
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
        Upload a pay stub or offer letter. Beacon reads it, pulls out the numbers, and asks you to confirm
        each one. We keep a short excerpt for context, not the original file.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            height: 44,
            padding: '0 12px',
            background: 'var(--color-bg-4)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-line-2)',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
          }}
        >
          <option value="auto">Detect automatically</option>
          {DOCUMENT_TYPES.map((d) => (
            <option key={d.key} value={d.key}>{d.label}</option>
          ))}
        </select>

        <label
          style={{
            height: 44,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 14px',
            background: 'var(--color-bg-3)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-line-2)',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            cursor: 'pointer',
            maxWidth: 260,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {fileName || 'Choose file'}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/gif,image/webp,text/plain"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            style={{ display: 'none' }}
          />
        </label>

        <BBtn onClick={submit} disabled={busy || !fileName}>
          {busy ? 'Reading…' : 'Upload'}
        </BBtn>
      </div>

      {result?.kind === 'ok' && (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Read <span style={{ color: 'var(--color-text)' }}>{result.filename}</span> and found{' '}
          <span style={{ color: 'var(--color-mint)' }}>{result.committed}</span>{' '}
          fact{result.committed === 1 ? '' : 's'} to review.
          {result.rejected > 0 && (
            <span style={{ color: 'var(--color-text-dim)' }}> {result.rejected} could not be read cleanly.</span>
          )}
          {result.committed > 0 && (
            <>
              {' '}
              <Link href="/knowledge/review" style={{ color: 'var(--color-text)', textDecoration: 'underline' }}>
                Review now
              </Link>
            </>
          )}
        </div>
      )}
      {result?.kind === 'error' && (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--color-warn)' }}>{result.message}</div>
      )}
    </Card>
  );
}
