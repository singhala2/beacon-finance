// Phase 9 (9D) — backfill. Re-index all of a user's documents from their stored
// redacted text. Useful after the Voyage key is first added, or after a model
// change. Idempotent: indexDocument replaces existing chunks.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { indexDocument } from '@/lib/knowledge/index-document';
import { isEmbeddingsConfigured } from '@/lib/embeddings';

export const runtime = 'nodejs';

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!isEmbeddingsConfigured()) {
    return NextResponse.json({ error: 'Semantic search is not configured.' }, { status: 503 });
  }

  const docs = await db.document.findMany({
    where: { userId, extractedText: { not: null } },
    select: { id: true, extractedText: true },
  });

  let indexed = 0;
  let chunks = 0;
  for (const doc of docs) {
    if (!doc.extractedText) continue;
    try {
      const text = decrypt(doc.extractedText);
      chunks += await indexDocument(userId, doc.id, text);
      indexed += 1;
    } catch {
      // Skip documents whose text cannot be decrypted/indexed; continue the rest.
    }
  }

  return NextResponse.json({ ok: true, documents: indexed, chunks });
}
