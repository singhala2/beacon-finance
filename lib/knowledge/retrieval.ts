// Phase 9 (9E) — semantic retrieval over the user's document corpus.
// Embeds the query and runs a cosine k-NN over that user's chunks via raw SQL
// (Prisma can't express pgvector operators). Scoped to the owner.

import { db } from '@/lib/db';
import { embedOne, isEmbeddingsConfigured } from '@/lib/embeddings';

export type RetrievedChunk = {
  documentId: string;
  filename: string;
  docKind: string | null;
  ord: number;
  content: string;
  distance: number;
};

export async function searchDocuments(userId: string, query: string, k = 6): Promise<RetrievedChunk[]> {
  if (!isEmbeddingsConfigured() || !query.trim()) return [];

  const vec = await embedOne(query, 'query');
  const literal = `[${vec.join(',')}]`;

  // <=> is cosine distance under the vector_cosine_ops HNSW index.
  return db.$queryRaw<RetrievedChunk[]>`
    SELECT c."documentId" AS "documentId",
           d.filename AS filename,
           d."docKind" AS "docKind",
           c.ord AS ord,
           c.content AS content,
           (c.embedding <=> ${literal}::vector) AS distance
    FROM "DocumentChunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE c."userId" = ${userId}
    ORDER BY c.embedding <=> ${literal}::vector
    LIMIT ${k}
  `;
}
