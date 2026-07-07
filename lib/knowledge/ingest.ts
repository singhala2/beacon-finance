// Phase 9 (9B + 9C) — the ingestion pipeline. One path for every document:
// extract its text, classify it open-endedly, summarize the key takeaways, and
// (for known registry types only) also extract structured facts into the ledger.
// Storing the encrypted original is handled by the route (9A); indexing for
// semantic search is added in 9D via indexDocument().

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { anthropic, CHAT_MODEL } from '@/lib/anthropic';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { redactPii, looksLikePii } from '@/lib/knowledge/redact';
import { DOCUMENT_TYPES, getDocumentType } from '@/lib/knowledge/registry';
import { extractFacts, fileToContentBlock, type FilePayload } from '@/lib/knowledge/extract';
import { commitFacts, type FactInput } from '@/lib/knowledge/facts';
import { indexDocument } from '@/lib/knowledge/index-document';

const INGEST_MODEL = 'claude-sonnet-4-6'; // transcription/classification: accuracy matters
const MAX_TEXT_CHARS = 60_000;

export type IngestResult = {
  docKind: string;
  knownType: string | null;
  committed: number;
  indexed: number;
};

/**
 * Run the full pipeline for an already-created Document whose original bytes are
 * available as `payload`. Updates the row in place and returns a summary.
 */
export async function processDocument(
  userId: string,
  documentId: string,
  payload: FilePayload,
  opts: { req?: Request } = {},
): Promise<IngestResult> {
  const rawText = (await extractText(payload)).slice(0, MAX_TEXT_CHARS);
  const redactedText = redactPii(rawText);
  const { docKind, knownType } = await classifyOpen(payload);

  const summary = redactedText.trim() ? redactPii(await summarize(redactedText, docKind)) : '';

  // Keep-both: known registry types also yield structured facts (8B extractor).
  let committed = 0;
  if (knownType) {
    try {
      const { facts } = await extractFacts(knownType, payload);
      const inputs: FactInput[] = facts
        .filter((f) => !looksLikePii(f.value))
        .map((f) => ({ domain: f.domain, key: f.factKey, value: f.value, source: 'document', documentId, confidence: f.confidence }));
      committed = (await commitFacts(userId, inputs, { req: opts.req })).committed;
    } catch {
      // A structured-extraction failure never blocks corpus ingestion.
    }
  }

  await db.document.update({
    where: { id: documentId },
    data: {
      type: knownType ?? 'other',
      docKind,
      summary: summary || null,
      // Encrypt the redacted full text at rest; 9D decrypts it to (re)build chunks.
      extractedText: redactedText.trim() ? encrypt(redactedText) : null,
      status: 'ready',
      processedAt: new Date(),
    },
  });

  // Semantic index (9D). Credential-gated on Voyage; a no-op without it.
  const indexed = await indexDocument(userId, documentId, redactedText).catch(() => 0);

  return { docKind, knownType, committed, indexed };
}

/** Full text of the document. Text payloads pass through; PDFs/images are transcribed by Claude. */
async function extractText(payload: FilePayload): Promise<string> {
  if (payload.kind === 'text') return payload.text;

  const res = await anthropic.messages.create({
    model: INGEST_MODEL,
    max_tokens: 4096,
    system: 'You transcribe documents. Output only the document text, verbatim, with no commentary.',
    messages: [{ role: 'user', content: [fileToContentBlock(payload), { type: 'text', text: 'Transcribe all text in this document.' }] }],
  });
  return res.content.filter((c) => c.type === 'text').map((c) => (c.type === 'text' ? c.text : '')).join('\n');
}

/** Open-ended classification: a freeform kind label + an optional known registry type. */
async function classifyOpen(payload: FilePayload): Promise<{ docKind: string; knownType: string | null }> {
  const keys = DOCUMENT_TYPES.map((d) => d.key);
  const tool: Tool = {
    name: 'classify',
    description: 'Identify the document.',
    input_schema: {
      type: 'object',
      properties: {
        doc_kind: { type: 'string', description: 'A short lowercase label for what this is, e.g. "tax return", "will", "bank statement", "pay stub".' },
        known_type: { type: 'string', enum: [...keys, 'none'], description: 'A matching known type, or "none".' },
      },
      required: ['doc_kind', 'known_type'],
    },
  };
  const res = await anthropic.messages.create({
    model: INGEST_MODEL,
    max_tokens: 200,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'classify' },
    messages: [{ role: 'user', content: [fileToContentBlock(payload), { type: 'text', text: 'Classify this document.' }] }],
  });
  const toolUse = res.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') return { docKind: 'document', knownType: null };
  const input = toolUse.input as { doc_kind?: string; known_type?: string };
  const kind = (input.doc_kind || 'document').trim().slice(0, 60);
  const known = input.known_type && input.known_type !== 'none' && getDocumentType(input.known_type) ? input.known_type : null;
  return { docKind: kind, knownType: known };
}

/** Short, redacted key-takeaways summary. */
async function summarize(redactedText: string, docKind: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: CHAT_MODEL,
    max_tokens: 400,
    system: `Summarize the key financial takeaways from this ${docKind} as 2 to 5 short bullet points. Facts only, no advice. Never include a Social Security number or full account number.`,
    messages: [{ role: 'user', content: redactedText.slice(0, 20_000) }],
  });
  return res.content.filter((c) => c.type === 'text').map((c) => (c.type === 'text' ? c.text : '')).join('\n').trim();
}
