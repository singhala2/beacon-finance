// Phase 8 (8E) — retrieval tools for the chat agent. The system prompt carries
// the highest-utility confirmed facts inline; these tools cover the long tail
// and let the agent pull a document's provenance mid-conversation.
//
// The interface is deliberately generic (select by domain/key/text). It can be
// swapped to a vector index later without changing the tool contract or callers.

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { db } from '@/lib/db';
import { getConfirmedFacts } from '@/lib/knowledge/facts';
import { getFactType, getDomain, getDocumentType } from '@/lib/knowledge/registry';
import { factLabel, formatFactValue } from '@/lib/knowledge/display';

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
];

export function isKnowledgeTool(name: string): boolean {
  return name === 'search_facts' || name === 'get_document';
}

export async function handleKnowledgeTool(userId: string, name: string, input: unknown): Promise<string> {
  const args = (input ?? {}) as { query?: string; domain?: string; documentId?: string };
  if (name === 'search_facts') return searchFacts(userId, args.query, args.domain);
  if (name === 'get_document') return getDocument(userId, args.documentId);
  return `Unknown tool: ${name}`;
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
