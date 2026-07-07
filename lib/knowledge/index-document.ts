// Phase 9 (9D) — semantic indexing. Chunk a document's redacted text, embed the
// chunks with Voyage, and store them as pgvector rows for retrieval (9E).
// Credential-gated on VOYAGE_API_KEY: a no-op (returns 0) when embeddings are
// not configured, so ingestion still works without the key.

import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { embed, isEmbeddingsConfigured } from '@/lib/embeddings';

const CHUNK_CHARS = 1000;
const CHUNK_OVERLAP = 150;
const MAX_CHUNKS = 200; // safety cap per document

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(start + CHUNK_CHARS, clean.length);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

/**
 * (Re)build the semantic index for a document from its already-redacted text.
 * Replaces any existing chunks. Returns the number of chunks indexed.
 */
export async function indexDocument(userId: string, documentId: string, redactedText: string): Promise<number> {
  if (!isEmbeddingsConfigured()) return 0;
  const chunks = chunkText(redactedText);

  // Always clear stale chunks first so re-indexing is idempotent.
  await db.documentChunk.deleteMany({ where: { documentId } });
  if (chunks.length === 0) return 0;

  const vectors = await embed(chunks, 'document');

  for (let i = 0; i < chunks.length; i++) {
    const vec = vectors[i];
    if (!vec) continue;
    const literal = `[${vec.join(',')}]`;
    await db.$executeRaw`
      INSERT INTO "DocumentChunk" (id, "userId", "documentId", ord, content, embedding, "createdAt")
      VALUES (${randomUUID()}, ${userId}, ${documentId}, ${i}, ${chunks[i]}, ${literal}::vector, now())
    `;
  }

  await logAudit({ userId, action: 'knowledge.document.index', targetType: 'Document', targetId: documentId, metadata: { chunks: chunks.length } });
  return chunks.length;
}
