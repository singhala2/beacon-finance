// Phase 8 (8E) — retrieval tools for the chat agent. The system prompt carries
// the highest-utility confirmed facts inline; these tools cover the long tail
// and let the agent pull a document's provenance mid-conversation.
//
// The interface is deliberately generic (select by domain/key/text). It can be
// swapped to a vector index later without changing the tool contract or callers.

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { db } from '@/lib/db';
import { getConfirmedFacts, commitFacts } from '@/lib/knowledge/facts';
import { DOMAINS, getFactType, getDomain, getDocumentType } from '@/lib/knowledge/registry';
import { factLabel, formatFactValue } from '@/lib/knowledge/display';
import { searchDocuments } from '@/lib/knowledge/retrieval';
import { isEmbeddingsConfigured } from '@/lib/embeddings';

const DOMAIN_KEYS = DOMAINS.map((d) => d.key);
const ALL_FACT_KEYS = DOMAINS.flatMap((d) => d.factTypes.map((ft) => ft.key));

export const KNOWLEDGE_TOOLS: Tool[] = [
  {
    name: 'search_facts',
    description:
      "Search the facts the user has confirmed about themselves (income, retirement, debt, housing, insurance, taxes, benefits, etc.) that their linked accounts cannot show. Use this when you need a specific detail not already given in the context. Returns confirmed facts only.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional keywords to match against fact names, e.g. "401k match", "APR", "rent".' },
        domain: { type: 'string', description: 'Optional domain key to scope the search, e.g. income, retirement, debt, housing, insurance, taxes, benefits.' },
      },
    },
  },
  {
    name: 'get_document',
    description:
      'List the documents the user has uploaded, or fetch the redacted provenance excerpt for one document by id. Use this to see what a fact was drawn from. Raw files are not stored; only a redacted excerpt is available.',
    input_schema: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Omit to list documents. Provide an id to fetch that document\'s excerpt.' },
      },
    },
  },
  {
    name: 'search_documents',
    description:
      "Semantically search the full text of every document the user has uploaded (tax returns, wills, statements, offer letters, anything). Use this to answer questions about the contents of their documents, e.g. 'what does my will say about the house' or 'what was my total tax last year'. Returns the most relevant passages with the source document. Always cite the document a passage came from.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look for, in natural language.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'capture_fact',
    description:
      'Record a durable personal-finance fact the user states in conversation (e.g. "my rent is 2400", "my 401k match is 4%"). Only use it for stable facts about the user, not one-off transactions or questions. The fact is saved as pending and the user confirms it in their review queue before Beacon relies on it, so never treat it as confirmed in your reply. Do not capture Social Security numbers or account numbers.',
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', enum: DOMAIN_KEYS, description: 'The domain this fact belongs to.' },
        key: { type: 'string', enum: ALL_FACT_KEYS, description: 'The specific fact type key within that domain.' },
        value: { type: 'string', description: 'The value as the user stated it (e.g. "2400", "4%"). It is normalized on save.' },
      },
      required: ['domain', 'key', 'value'],
    },
  },
];

export function isKnowledgeTool(name: string): boolean {
  return (
    name === 'search_facts' ||
    name === 'get_document' ||
    name === 'search_documents' ||
    name === 'capture_fact'
  );
}

export async function handleKnowledgeTool(userId: string, name: string, input: unknown): Promise<string> {
  const args = (input ?? {}) as { query?: string; domain?: string; documentId?: string; key?: string; value?: string };
  if (name === 'search_facts') return searchFacts(userId, args.query, args.domain);
  if (name === 'get_document') return getDocument(userId, args.documentId);
  if (name === 'search_documents') return searchCorpus(userId, args.query);
  if (name === 'capture_fact') return captureFact(userId, args.domain, args.key, args.value);
  return `Unknown tool: ${name}`;
}

async function searchCorpus(userId: string, query?: string): Promise<string> {
  if (!isEmbeddingsConfigured()) {
    return 'Document search is not available right now. Answer from the facts and document summaries you already have.';
  }
  if (!query?.trim()) return 'Provide a query to search the documents.';
  const hits = await searchDocuments(userId, query, 6);
  if (hits.length === 0) return 'No document passages matched. The user may not have uploaded a document covering that.';
  return hits
    .map((h) => `From "${h.filename}"${h.docKind ? ` (${h.docKind})` : ''}:\n${h.content}`)
    .join('\n\n---\n\n');
}

async function captureFact(userId: string, domain?: string, key?: string, value?: string): Promise<string> {
  if (!domain || !key || value === undefined || value === '') {
    return 'Could not save: need a domain, a fact key, and a value.';
  }
  const result = await commitFacts(userId, [{ domain, key, value, source: 'chat' }]);
  if (result.committed === 0) {
    const why = result.rejected[0]?.error ?? 'it did not match a known fact type';
    return `Could not save that fact: ${why}. Do not tell the user it was saved.`;
  }
  return 'Saved as a pending fact. Tell the user you have noted it and they can confirm it in their review queue. Do not treat it as confirmed yet.';
}

async function searchFacts(userId: string, query?: string, domain?: string): Promise<string> {
  const scoped = domain && getDomain(domain) ? domain : undefined;
  const facts = await getConfirmedFacts(userId, scoped);

  const q = query?.trim().toLowerCase();
  const matched = facts.filter((f) => {
    if (!q) return true;
    const label = factLabel(f.domain, f.key).toLowerCase();
    return label.includes(q) || f.key.toLowerCase().includes(q) || f.domain.toLowerCase().includes(q);
  });

  if (matched.length === 0) {
    return query || domain
      ? 'No confirmed facts match that. The user may not have added it yet.'
      : 'The user has no confirmed facts yet.';
  }

  return matched
    .map((f) => {
      const ft = getFactType(f.domain, f.key);
      const domainLabel = getDomain(f.domain)?.label ?? f.domain;
      return `- [${domainLabel}] ${factLabel(f.domain, f.key)}: ${formatFactValue(f.valueType, f.valueJson, ft?.unit)}`;
    })
    .join('\n');
}

async function getDocument(userId: string, documentId?: string): Promise<string> {
  if (!documentId) {
    const docs = await db.document.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      select: { id: true, filename: true, type: true, status: true, uploadedAt: true },
    });
    if (docs.length === 0) return 'The user has not uploaded any documents.';
    return docs
      .map((d) => `- ${d.id}: ${d.filename} (${getDocumentType(d.type)?.label ?? d.type}), ${d.status}`)
      .join('\n');
  }

  const doc = await db.document.findFirst({
    where: { id: documentId, userId },
    select: { filename: true, type: true, sourceExcerpt: true, status: true },
  });
  if (!doc) return 'No document with that id for this user.';
  const label = getDocumentType(doc.type)?.label ?? doc.type;
  if (!doc.sourceExcerpt) return `${doc.filename} (${label}), status ${doc.status}. No excerpt is available.`;
  return `Excerpt from ${doc.filename} (${label}), redacted:\n${doc.sourceExcerpt}`;
}
