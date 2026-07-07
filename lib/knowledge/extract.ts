// Phase 8 (8B) — the generic, schema-driven extractor.
// One code path for every document type. It reads the doc type's
// `extractionFields` from the registry, builds an Anthropic tool from them, and
// forces Claude to return typed JSON. Adding a new document type is a registry
// declaration; this file never changes.

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { anthropic } from '@/lib/anthropic';
import {
  DOCUMENT_TYPES,
  getDocumentType,
  type DocumentType,
} from '@/lib/knowledge/registry';
import { redactPii } from '@/lib/knowledge/redact';

// Sonnet, matching lib/insights-ai.ts: extraction is persisted, higher-stakes
// output, so we do not use the cheaper chat model.
const EXTRACTION_MODEL = 'claude-sonnet-4-6';

export type FilePayload =
  | { kind: 'pdf'; base64: string }
  | { kind: 'image'; mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; base64: string }
  | { kind: 'text'; text: string };

export type ExtractedFact = {
  factKey: string;
  domain: string;
  value: string;
  confidence: number;
  evidence: string;
};

export type ExtractionResult = {
  facts: ExtractedFact[];
  // Redacted, human-readable provenance we can persist on the Document and show
  // beside each fact in the confirmation queue (8C).
  excerpt: string;
};

// Turn one document type's declared fields into a strict tool schema. Every
// field is optional (a pay stub may omit equity); the model is told to skip
// what it cannot find rather than guess.
function buildExtractionTool(docType: DocumentType): Tool {
  const fieldKeys = docType.extractionFields.map((f) => f.factKey);
  return {
    name: 'submit_extraction',
    description: `Extract the requested fields from this ${docType.label}. Only include a field if the document clearly states it. Never guess. Never include Social Security numbers or full account numbers in any value or evidence string.`,
    input_schema: {
      type: 'object',
      properties: {
        facts: {
          type: 'array',
          description: 'One entry per field found in the document.',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', enum: fieldKeys, description: 'Which field this value is.' },
              value: { type: 'string', description: 'The value exactly as stated (numbers may keep $ and , — they are normalized downstream).' },
              confidence: { type: 'number', description: '0..1 confidence this value is correct and unambiguous.' },
              evidence: { type: 'string', description: 'A short verbatim snippet (max ~120 chars) from the document that supports this value. No SSNs or account numbers.' },
            },
            required: ['field', 'value', 'confidence', 'evidence'],
          },
        },
      },
      required: ['facts'],
    },
  };
}

function fileToContentBlock(file: FilePayload) {
  if (file.kind === 'pdf') {
    return { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: file.base64 } };
  }
  if (file.kind === 'image') {
    return { type: 'image' as const, source: { type: 'base64' as const, media_type: file.mediaType, data: file.base64 } };
  }
  // Text is redacted before it ever reaches Anthropic.
  return { type: 'text' as const, text: redactPii(file.text) };
}

/**
 * Extract facts for a known document type. Returns typed-but-unvalidated string
 * values; the caller passes them through `commitFacts`, which validates every
 * value against the registry. Fields the model omits simply do not appear.
 */
export async function extractFacts(docTypeKey: string, file: FilePayload): Promise<ExtractionResult> {
  const docType = getDocumentType(docTypeKey);
  if (!docType) throw new Error(`Unknown document type: ${docTypeKey}`);

  const tool = buildExtractionTool(docType);
  const fieldGuide = docType.extractionFields
    .map((f) => `- ${f.factKey} (${f.valueType}): ${f.description}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1500,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_extraction' },
    system: `You extract structured financial facts from documents. Fields to look for in this ${docType.label}:\n${fieldGuide}\n\nReturn only fields the document clearly supports. Do not infer or annualize unless asked. Never output a Social Security number or a full bank/card/account number.`,
    messages: [
      {
        role: 'user',
        content: [
          fileToContentBlock(file),
          { type: 'text', text: 'Extract the fields defined by the submit_extraction tool.' },
        ],
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Extractor did not return a tool call');
  }
  const input = toolUse.input as { facts?: Array<{ field?: string; value?: string; confidence?: number; evidence?: string }> };
  const raw = input.facts ?? [];

  const byKey = new Map(docType.extractionFields.map((f) => [f.factKey, f]));
  const facts: ExtractedFact[] = [];
  const evidenceLines: string[] = [];

  for (const item of raw) {
    const field = byKey.get(item.field ?? '');
    if (!field || typeof item.value !== 'string' || !item.value.trim()) continue;
    const confidence = typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.5;
    const evidence = redactPii((item.evidence ?? '').slice(0, 160));
    facts.push({ factKey: field.factKey, domain: field.domain, value: item.value.trim(), confidence, evidence });
    if (evidence) evidenceLines.push(`${field.factKey}: ${evidence}`);
  }

  return { facts, excerpt: evidenceLines.join('\n').slice(0, 2000) };
}

/**
 * Best-effort classification when the uploader does not tell us the document
 * type. Returns a registry document-type key, or null if Claude cannot place it
 * among the known types (the caller then asks the user to pick).
 */
export async function classifyDocument(file: FilePayload): Promise<string | null> {
  const keys = DOCUMENT_TYPES.map((d) => d.key);
  const tool: Tool = {
    name: 'classify',
    description: 'Identify which known document type this is.',
    input_schema: {
      type: 'object',
      properties: {
        document_type: { type: 'string', enum: [...keys, 'unknown'], description: 'Best match, or "unknown".' },
      },
      required: ['document_type'],
    },
  };

  const catalog = DOCUMENT_TYPES.map((d) => `- ${d.key}: ${d.label}. ${d.description}`).join('\n');
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 200,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'classify' },
    system: `Classify the document into exactly one known type or "unknown". Known types:\n${catalog}`,
    messages: [{ role: 'user', content: [fileToContentBlock(file), { type: 'text', text: 'Classify this document.' }] }],
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') return null;
  const picked = (toolUse.input as { document_type?: string }).document_type;
  return picked && picked !== 'unknown' && keys.includes(picked) ? picked : null;
}
