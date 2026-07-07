// Phase 9 (9D) — embeddings via Voyage AI. Credential-gated on VOYAGE_API_KEY;
// callers check isEmbeddingsConfigured() and skip indexing/retrieval when absent.

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
export const EMBEDDING_MODEL = 'voyage-3.5';
export const EMBEDDING_DIMS = 1024; // must match the pgvector column type

export function isEmbeddingsConfigured(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY);
}

type InputType = 'document' | 'query';

/**
 * Embed a batch of texts. `inputType` lets Voyage optimize doc vs query
 * embeddings. Returns one vector per input, in order.
 */
export async function embed(texts: string[], inputType: InputType): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('VOYAGE_API_KEY is not set');
  if (texts.length === 0) return [];

  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
      input_type: inputType,
      output_dimension: EMBEDDING_DIMS,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Voyage embeddings failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  return (json.data ?? []).map((d) => d.embedding);
}

export async function embedOne(text: string, inputType: InputType): Promise<number[]> {
  const [v] = await embed([text], inputType);
  return v;
}
