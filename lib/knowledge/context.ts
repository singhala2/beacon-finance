// Phase 8 (8E) — assemble confirmed facts into a compact block for the chat
// system prompt. Priority-budgeted: when a user has more confirmed facts than
// fit, the highest marginal-utility facts (the ones Plaid cannot see) win the
// budget, and the long tail is reachable via the search_facts tool.

import { db } from '@/lib/db';
import { getConfirmedFacts } from '@/lib/knowledge/facts';
import { DOMAINS, getDomain, getFactType, type MarginalWeight } from '@/lib/knowledge/registry';
import { factLabel, formatFactValue } from '@/lib/knowledge/display';
import { isEmbeddingsConfigured } from '@/lib/embeddings';

const WEIGHT_RANK: Record<MarginalWeight, number> = { high: 0, medium: 1, low: 2 };
const DEFAULT_BUDGET_CHARS = 1600;

type Line = { domain: string; text: string; rank: number; chars: number };

/**
 * Build the "what Beacon knows about you" block. Returns an empty string when
 * there are no confirmed facts, so callers can conditionally include it.
 */
export async function buildKnowledgeContext(
  userId: string,
  opts: { budgetChars?: number } = {},
): Promise<string> {
  const budget = opts.budgetChars ?? DEFAULT_BUDGET_CHARS;
  const facts = await getConfirmedFacts(userId);
  if (facts.length === 0) return '';

  const domainOrder = new Map<string, number>(DOMAINS.map((d) => [d.key, d.order]));

  // One rendered line per fact, tagged with its marginal-utility rank.
  const lines: Line[] = facts.map((f) => {
    const ft = getFactType(f.domain, f.key);
    const label = factLabel(f.domain, f.key);
    const value = formatFactValue(f.valueType, f.valueJson, ft?.unit);
    const text = `${label}: ${value}`;
    return { domain: f.domain, text, rank: ft ? WEIGHT_RANK[ft.marginalWeight] : 1, chars: text.length };
  });

  // Fill the budget by marginal utility (highest weight first).
  const byUtility = [...lines].sort((a, b) => a.rank - b.rank);
  const included = new Set<Line>();
  let used = 0;
  let omitted = 0;
  for (const line of byUtility) {
    if (used + line.chars <= budget) {
      included.add(line);
      used += line.chars;
    } else {
      omitted += 1;
    }
  }

  // Render the included facts grouped by domain, in registry order.
  const grouped = new Map<string, string[]>();
  for (const line of lines) {
    if (!included.has(line)) continue;
    const arr = grouped.get(line.domain) ?? [];
    arr.push(line.text);
    grouped.set(line.domain, arr);
  }

  const domainBlocks = [...grouped.entries()]
    .sort((a, b) => (domainOrder.get(a[0]) ?? 99) - (domainOrder.get(b[0]) ?? 99))
    .map(([domainKey, texts]) => {
      const label = getDomain(domainKey)?.label ?? domainKey;
      return `- ${label}: ${texts.join('; ')}.`;
    });

  const header =
    'What you know about this user, confirmed by them (treat as ground truth; it overrides generic assumptions and reflects things their linked accounts cannot show):';
  return renderFactBlock(header, domainBlocks, omitted);
}

function renderFactBlock(header: string, domainBlocks: string[], omitted: number): string {
  const tail =
    omitted > 0
      ? `\n(${omitted} more confirmed fact${omitted === 1 ? '' : 's'} not shown here. Use the search_facts tool if you need details beyond the above.)`
      : '';

  return `${header}\n${domainBlocks.join('\n')}${tail}`;
}

/**
 * A short catalogue of the documents the user has uploaded, so the agent knows
 * what it can reach for via search_documents. Returns '' when there are no
 * documents or when semantic search is not configured.
 */
export async function buildDocumentContext(userId: string, limit = 20): Promise<string> {
  if (!isEmbeddingsConfigured()) return '';
  const docs = await db.document.findMany({
    where: { userId, status: 'ready' },
    orderBy: { uploadedAt: 'desc' },
    take: limit,
    select: { filename: true, docKind: true },
  });
  if (docs.length === 0) return '';

  const lines = docs.map((d) => `- ${d.filename}${d.docKind ? ` (${d.docKind})` : ''}`);
  return `Documents this user has uploaded (use the search_documents tool to read their contents when a question touches them; cite the document you used):\n${lines.join('\n')}`;
}
