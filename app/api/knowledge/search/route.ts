// Phase 9 (9F) — corpus search for the filing-cabinet UI. Semantic search over
// the user's documents, grouped by document with the best matching snippet.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchDocuments } from '@/lib/knowledge/retrieval';
import { isEmbeddingsConfigured } from '@/lib/embeddings';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!isEmbeddingsConfigured()) {
    return NextResponse.json({ error: 'Search is not configured yet.', results: [] }, { status: 200 });
  }

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (!query) return NextResponse.json({ results: [] });

  const hits = await searchDocuments(userId, query, 8);

  // Keep the best (nearest) snippet per document.
  const byDoc = new Map<string, { documentId: string; filename: string; docKind: string | null; snippet: string }>();
  for (const h of hits) {
    if (!byDoc.has(h.documentId)) {
      byDoc.set(h.documentId, { documentId: h.documentId, filename: h.filename, docKind: h.docKind, snippet: h.content });
    }
  }

  return NextResponse.json({ results: [...byDoc.values()] });
}
