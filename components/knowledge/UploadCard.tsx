'use client';

// Phase 9 (9B) — open upload. Accept any document; Beacon stores it, works out
// what it is, summarizes it, and (for known types) pulls structured facts.

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BBtn } from '@/components/ui';
import { Card, CardHeader } from '@/components/dashboard/Card';

type Result =
  | { kind: 'ok'; filename: string; docKind?: string; committed: number; read: boolean }
  | { kind: 'error'; message: string };

export function UploadCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
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
      const res = await fetch('/api/knowledge/documents', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: 'error', message: data.error ?? 'Upload failed.' });
      } else {
        setResult({
          kind: 'ok',
          filename: data.document?.filename ?? file.name,
          docKind: data.document?.docKind,
          committed: data.committed ?? 0,
          read: data.read ?? false,
        });
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
        Upload anything: a pay stub, a tax return, a loan statement, a will. Beacon stores it securely,
        figures out what it is, and can pull on it when you ask questions in chat.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
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
            maxWidth: 320,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {fileName || 'Choose file'}
          <input
            ref={inputRef}
            type="file"
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
          Stored <span style={{ color: 'var(--color-text)' }}>{result.filename}</span>
          {result.docKind ? <> as a <span style={{ color: 'var(--color-text)' }}>{result.docKind}</span></> : null}.
          {result.read && result.committed > 0 ? (
            <>
              {' '}Found <span style={{ color: 'var(--color-mint)' }}>{result.committed}</span>{' '}
              fact{result.committed === 1 ? '' : 's'} to review.{' '}
              <Link href="/knowledge/review" style={{ color: 'var(--color-text)', textDecoration: 'underline' }}>
                Review now
              </Link>
            </>
          ) : result.read ? (
            <> Beacon can now use it in chat.</>
          ) : (
            <> Saved to your cabinet.</>
          )}
        </div>
      )}
      {result?.kind === 'error' && (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--color-warn)' }}>{result.message}</div>
      )}
    </Card>
  );
}
