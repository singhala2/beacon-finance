'use client';

// Phase 9 (9F) — the filing cabinet. Search the corpus, and browse / open /
// delete every uploaded document.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BBtn, BInput } from '@/components/ui';
import { Card, CardHeader, CardEmptyState } from '@/components/dashboard/Card';

export type DocItem = {
  id: string;
  filename: string;
  docKind: string | null;
  sizeLabel: string;
  status: string;
  dateLabel: string;
  hasOriginal: boolean;
  summary: string | null;
};

type SearchHit = { documentId: string; filename: string; docKind: string | null; snippet: string };

export function DocumentsBrowser({ documents, searchEnabled }: { documents: DocItem[]; searchEnabled: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function runSearch() {
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function remove(id: string) {
    if (deleting) return;
    setDeleting(id);
    try {
      await fetch(`/api/knowledge/documents/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      {searchEnabled && (
        <div style={{ marginBottom: 16 }}>
          <Card>
            <CardHeader eyebrow="Search your documents" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <BInput
                value={query}
                onChange={setQuery}
                placeholder="e.g. what does my will say about the house"
                containerStyle={{ flex: 1 }}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') runSearch(); }}
              />
              <BBtn onClick={runSearch} disabled={searching || !query.trim()}>
                {searching ? 'Searching…' : 'Search'}
              </BBtn>
            </div>

            {results !== null && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No matching passages.</div>
                ) : (
                  results.map((r) => (
                    <div key={r.documentId} style={{ borderLeft: '2px solid var(--color-line-2)', paddingLeft: 10 }}>
                      <a href={`/api/knowledge/documents/${r.documentId}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 540, color: 'var(--color-text)', textDecoration: 'none' }}>
                        {r.filename}{r.docKind ? <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}> · {r.docKind}</span> : null}
                      </a>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>
                        {r.snippet.slice(0, 240)}{r.snippet.length > 240 ? '…' : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      <Card>
        <CardHeader
          eyebrow="All documents"
          trailing={
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              {documents.length} stored
            </span>
          }
        />
        {documents.length === 0 ? (
          <CardEmptyState>Nothing here yet. Upload a document to start your cabinet.</CardEmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {documents.map((doc) => (
              <div key={doc.id} style={{ borderTop: '1px solid var(--color-line)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 540, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.filename}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {doc.docKind ?? doc.status} · {doc.dateLabel} · {doc.sizeLabel}
                    </div>
                  </div>
                  {doc.hasOriginal && (
                    <a href={`/api/knowledge/documents/${doc.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--color-text)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                      Open
                    </a>
                  )}
                  <button
                    onClick={() => remove(doc.id)}
                    disabled={deleting === doc.id}
                    style={{ fontSize: 12, color: 'var(--color-warn)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                  >
                    {deleting === doc.id ? '…' : 'Delete'}
                  </button>
                </div>
                {doc.summary && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' }}>
                    {doc.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
