import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDomain, getDocumentType } from '@/lib/knowledge/registry';
import { factLabel, formatFactValue, evidenceForKey } from '@/lib/knowledge/display';
import { ConfirmationQueue, type QueueItem } from '@/components/knowledge/ConfirmationQueue';

// Phase 8 (8C) — the confirmation queue page.
export default async function KnowledgeReviewPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const facts = await db.knowledgeFact.findMany({
    where: { userId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
    include: { document: { select: { filename: true, type: true, sourceExcerpt: true } } },
  });

  const items: QueueItem[] = facts.map((f) => {
    const domainLabel = getDomain(f.domain)?.label ?? f.domain;
    const sourceLabel = f.document
      ? `From ${f.document.filename} (${getDocumentType(f.document.type)?.label ?? f.document.type})`
      : f.source === 'chat'
        ? 'From chat'
        : 'Entered manually';
    return {
      id: f.id,
      label: factLabel(f.domain, f.key),
      domainLabel,
      displayValue: formatFactValue(f.valueType, f.valueJson),
      editValue: toEditValue(f.valueType, f.valueJson),
      valueType: f.valueType,
      sourceLabel,
      evidence: evidenceForKey(f.document?.sourceExcerpt, f.key),
      confidence: f.confidence,
    };
  });

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/knowledge" style={{ fontSize: 12, color: 'var(--color-text-dim)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
          ← Knowledge
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6, margin: '8px 0 4px', lineHeight: 1.1 }}>
          Review facts
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Beacon pulled these from your documents and chats. Confirm what is right so it can use them. A misread
          number is worse than a missing one, so nothing counts until you say so.
        </p>
      </div>

      <ConfirmationQueue items={items} />
    </div>
  );
}

// Prefill value for the edit input: a plain, re-parseable string.
function toEditValue(valueType: string, value: unknown): string {
  if (valueType === 'date' && typeof value === 'string') return value.slice(0, 10);
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}
