import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardHeader, CardEmptyState } from '@/components/dashboard/Card';
import { UploadCard } from '@/components/knowledge/UploadCard';
import { getDocumentType } from '@/lib/knowledge/registry';
import { getFactsByStatus } from '@/lib/knowledge/facts';

// Phase 8 (8B) — minimal Knowledge Hub. Upload + recent documents so the
// extraction pipeline is testable end to end. 8D turns this into the
// domain-organized Hub; 8C adds the confirmation queue.
export default async function KnowledgePage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const [documents, pending] = await Promise.all([
    db.document.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      select: { id: true, type: true, filename: true, status: true, uploadedAt: true },
    }),
    getFactsByStatus(userId, 'pending'),
  ]);

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6, margin: '0 0 4px', lineHeight: 1.1 }}>
          Knowledge
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Give Beacon context it cannot see through your accounts. Upload a document and Beacon pulls out
          the facts for you to confirm.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <UploadCard />
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Card>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              <span style={{ color: 'var(--color-mint)' }}>{pending.length}</span>{' '}
              fact{pending.length === 1 ? '' : 's'} waiting for you to confirm. The review queue arrives next.
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader
          eyebrow="Documents"
          trailing={
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              {documents.length} uploaded
            </span>
          }
        />
        {documents.length === 0 ? (
          <CardEmptyState>Nothing yet. Upload a pay stub or offer letter to get started.</CardEmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 540, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.filename}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {getDocumentType(doc.type)?.label ?? doc.type} · {doc.uploadedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: doc.status === 'ready' ? 'var(--color-mint)' : doc.status === 'failed' ? 'var(--color-warn)' : 'var(--color-text-dim)',
                    flexShrink: 0,
                  }}
                >
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
