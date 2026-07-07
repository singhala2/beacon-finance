import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isEmbeddingsConfigured } from '@/lib/embeddings';
import { DocumentsBrowser, type DocItem } from '@/components/knowledge/DocumentsBrowser';

// Phase 9 (9F) — the filing cabinet: browse, open, delete, and search every
// uploaded document.
export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const docs = await db.document.findMany({
    where: { userId },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, filename: true, docKind: true, sizeBytes: true, status: true, uploadedAt: true, objectKey: true, summary: true },
  });

  const documents: DocItem[] = docs.map((d) => ({
    id: d.id,
    filename: d.filename,
    docKind: d.docKind,
    sizeLabel: formatBytes(d.sizeBytes),
    status: d.status,
    dateLabel: d.uploadedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    hasOriginal: Boolean(d.objectKey),
    summary: d.summary,
  }));

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/knowledge" style={{ fontSize: 12, color: 'var(--color-text-dim)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
          ← Knowledge
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6, margin: '8px 0 4px', lineHeight: 1.1 }}>
          Documents
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Everything you have uploaded, in one place. Search across it, open the originals, or remove what you
          no longer want Beacon to keep.
        </p>
      </div>

      <DocumentsBrowser documents={documents} searchEnabled={isEmbeddingsConfigured()} />
    </div>
  );
}

function formatBytes(n: number | null): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
