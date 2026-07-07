// Phase 9 — semantic indexing hook. Stubbed in 9B (no-op); implemented in 9D
// with pgvector + Voyage embeddings. Kept as its own module so ingest.ts does
// not change when indexing lands.

export async function indexDocument(_userId: string, _documentId: string, _redactedText: string): Promise<number> {
  return 0;
}
