// Phase 8 — Knowledge Hub: the single commit path for facts.
//
// Every source (document extraction, chat capture, manual entry, Plaid/system
// derivation) writes through commitFacts. That keeps validation, provenance,
// supersession, and audit logging in one place regardless of where a fact came
// from. Nothing else should call db.knowledgeFact.create directly.

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { logAudit } from '@/lib/audit';
import { getFactType, validateFactValue } from '@/lib/knowledge/registry';

export type FactSource = 'document' | 'chat' | 'manual' | 'plaid' | 'system';
export type FactStatus = 'pending' | 'confirmed' | 'rejected';

// Sources Beacon derives itself are trusted, so they land already confirmed.
// User-facing sources (documents, chat, manual) stay pending until reviewed.
const AUTO_CONFIRMED: ReadonlySet<FactSource> = new Set(['plaid', 'system']);

export type FactInput = {
  domain: string;
  key: string;
  value: unknown; // validated + normalized against the registry before persist
  source: FactSource;
  documentId?: string;
  confidence?: number;
  effectiveDate?: Date | null;
};

export type CommitResult = {
  committed: number;
  rejected: { key: string; error: string }[];
};

// Validates each input against the registry and persists the valid ones. Invalid
// inputs are collected and returned rather than throwing, so a bad extraction of
// one field never loses the good fields alongside it.
export async function commitFacts(
  userId: string,
  inputs: FactInput[],
  opts: { req?: Request } = {},
): Promise<CommitResult> {
  const rejected: { key: string; error: string }[] = [];
  const rows: Prisma.KnowledgeFactCreateManyInput[] = [];

  for (const input of inputs) {
    const factType = getFactType(input.domain, input.key);
    if (!factType) {
      rejected.push({ key: input.key, error: `unknown fact ${input.domain}.${input.key}` });
      continue;
    }
    const validated = validateFactValue(factType, input.value);
    if (!validated.ok) {
      rejected.push({ key: input.key, error: validated.error });
      continue;
    }
    rows.push({
      userId,
      domain: input.domain,
      key: input.key,
      valueJson: validated.value,
      valueType: factType.valueType,
      source: input.source,
      documentId: input.documentId ?? null,
      confidence: input.confidence ?? null,
      status: AUTO_CONFIRMED.has(input.source) ? 'confirmed' : 'pending',
      effectiveDate: input.effectiveDate ?? null,
    });
  }

  if (rows.length > 0) {
    await db.knowledgeFact.createMany({ data: rows });
    // Auto-confirmed facts supersede prior live values immediately; pending ones
    // wait for the user to confirm (handled in confirmFact).
    for (const row of rows) {
      if (row.status === 'confirmed') {
        await supersedePriorFacts(userId, row.key);
      }
    }
    await logAudit({
      userId,
      action: 'knowledge.fact.commit',
      targetType: 'KnowledgeFact',
      metadata: { count: rows.length, keys: rows.map((r) => r.key) },
      req: opts.req,
    });
  }

  if (rejected.length > 0) {
    log.warn('commitFacts dropped invalid inputs', { userId, rejected });
  }

  return { committed: rows.length, rejected };
}

// Confirms a pending fact and supersedes any prior confirmed value for the same
// key. An optional patch lets the user correct the value before confirming.
export async function confirmFact(
  userId: string,
  factId: string,
  patch?: { value: unknown },
  opts: { req?: Request } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fact = await db.knowledgeFact.findFirst({ where: { id: factId, userId } });
  if (!fact) return { ok: false, error: 'fact not found' };
  if (fact.status === 'rejected') return { ok: false, error: 'fact was rejected' };

  let valueJson = fact.valueJson;
  if (patch) {
    const factType = getFactType(fact.domain, fact.key);
    if (!factType) return { ok: false, error: 'unknown fact type' };
    const validated = validateFactValue(factType, patch.value);
    if (!validated.ok) return { ok: false, error: validated.error };
    valueJson = validated.value;
  }

  await db.$transaction([
    db.knowledgeFact.update({
      where: { id: factId },
      data: { status: 'confirmed', valueJson: valueJson ?? undefined },
    }),
    db.knowledgeFact.updateMany({
      where: { userId, key: fact.key, status: 'confirmed', supersededById: null, id: { not: factId } },
      data: { supersededById: factId },
    }),
  ]);

  await logAudit({
    userId,
    action: 'knowledge.fact.confirm',
    targetType: 'KnowledgeFact',
    targetId: factId,
    metadata: { key: fact.key, edited: Boolean(patch) },
    req: opts.req,
  });
  return { ok: true };
}

export async function rejectFact(
  userId: string,
  factId: string,
  opts: { req?: Request } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fact = await db.knowledgeFact.findFirst({ where: { id: factId, userId } });
  if (!fact) return { ok: false, error: 'fact not found' };

  await db.knowledgeFact.update({ where: { id: factId }, data: { status: 'rejected' } });
  await logAudit({
    userId,
    action: 'knowledge.fact.reject',
    targetType: 'KnowledgeFact',
    targetId: factId,
    metadata: { key: fact.key },
    req: opts.req,
  });
  return { ok: true };
}

// The live, confirmed facts for a user: confirmed and not yet superseded.
// This is what the Hub view and the chat-context assembler read.
export function getConfirmedFacts(userId: string, domain?: string) {
  return db.knowledgeFact.findMany({
    where: { userId, status: 'confirmed', supersededById: null, ...(domain ? { domain } : {}) },
    orderBy: [{ domain: 'asc' }, { effectiveDate: 'desc' }, { createdAt: 'desc' }],
  });
}

export function getFactsByStatus(userId: string, status: FactStatus) {
  return db.knowledgeFact.findMany({
    where: { userId, status },
    orderBy: { createdAt: 'desc' },
  });
}

// Points any prior live confirmed facts for a key at nothing-yet; used when an
// auto-confirmed (plaid/system) fact arrives. The newest row for the key stays
// live because we only supersede rows created before it.
async function supersedePriorFacts(userId: string, key: string): Promise<void> {
  const live = await db.knowledgeFact.findMany({
    where: { userId, key, status: 'confirmed', supersededById: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (live.length <= 1) return;
  const [newest, ...older] = live;
  await db.knowledgeFact.updateMany({
    where: { id: { in: older.map((f) => f.id) } },
    data: { supersededById: newest.id },
  });
}
