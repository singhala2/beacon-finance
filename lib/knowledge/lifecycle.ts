// Phase 8 (8F) — fact lifecycle: staleness re-verification and Plaid-vs-fact
// conflict surfacing. Both are read-only detectors that feed invitations in the
// Hub. Neither mutates facts; the user acts through the normal confirm/edit flow.

import { db } from '@/lib/db';
import { getFactType } from '@/lib/knowledge/registry';
import { factLabel, formatFactValue } from '@/lib/knowledge/display';

// How long a confirmed fact stays fresh before Beacon invites a re-check. Comp,
// rates, and rent drift over a year; this is a gentle nudge, not an expiry.
const STALE_AFTER_DAYS = 180;

// Sources the user actively vouched for vs. sources Beacon derives itself.
const USER_SOURCES = new Set(['document', 'chat', 'manual']);
const DERIVED_SOURCES = new Set(['plaid', 'system']);

export type StaleFact = {
  id: string;
  label: string;
  displayValue: string;
  reason: 'expired' | 'aging';
};

export async function getStaleFacts(userId: string, now: Date = new Date()): Promise<StaleFact[]> {
  const facts = await db.knowledgeFact.findMany({
    where: { userId, status: 'confirmed', supersededById: null },
    orderBy: { updatedAt: 'asc' },
  });
  const staleBefore = new Date(now.getTime() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const out: StaleFact[] = [];
  for (const f of facts) {
    const ft = getFactType(f.domain, f.key);
    const base = {
      id: f.id,
      label: factLabel(f.domain, f.key),
      displayValue: formatFactValue(f.valueType, f.valueJson, ft?.unit),
    };
    if (f.expiresAt && f.expiresAt < now) out.push({ ...base, reason: 'expired' });
    else if (f.updatedAt < staleBefore) out.push({ ...base, reason: 'aging' });
  }
  return out;
}

export type FactConflict = {
  label: string;
  confirmedValue: string;
  otherValue: string;
  otherSource: string;
};

/**
 * Surface keys where a fact the user confirmed disagrees with what Beacon
 * derives from Plaid. This is dormant until a Plaid/system fact writer exists
 * (out of Phase 8 scope); the detector is generic so it lights up automatically
 * once derived facts land in the ledger.
 */
export async function detectConflicts(userId: string): Promise<FactConflict[]> {
  const facts = await db.knowledgeFact.findMany({
    where: { userId, status: 'confirmed' },
  });

  // Live user-confirmed value per key.
  const userLive = new Map<string, (typeof facts)[number]>();
  for (const f of facts) {
    if (f.supersededById === null && USER_SOURCES.has(f.source)) userLive.set(f.key, f);
  }

  const conflicts: FactConflict[] = [];
  for (const f of facts) {
    if (!DERIVED_SOURCES.has(f.source)) continue;
    const mine = userLive.get(f.key);
    if (!mine) continue;
    if (JSON.stringify(mine.valueJson) === JSON.stringify(f.valueJson)) continue;
    const ft = getFactType(mine.domain, mine.key);
    conflicts.push({
      label: factLabel(mine.domain, mine.key),
      confirmedValue: formatFactValue(mine.valueType, mine.valueJson, ft?.unit),
      otherValue: formatFactValue(f.valueType, f.valueJson, ft?.unit),
      otherSource: f.source,
    });
  }
  return conflicts;
}
