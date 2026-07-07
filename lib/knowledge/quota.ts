// Phase 9 (9A) — per-user storage quota for uploaded documents.

import { db } from '@/lib/db';

// Default cap per user. A constant for now; can move to a per-plan value later.
export const QUOTA_BYTES = 100 * 1024 * 1024; // 100 MB

export async function getUsage(userId: string): Promise<number> {
  const agg = await db.document.aggregate({ where: { userId }, _sum: { sizeBytes: true } });
  return agg._sum.sizeBytes ?? 0;
}

/** True if a new file of `incomingBytes` would fit under the user's quota. */
export async function hasRoom(userId: string, incomingBytes: number): Promise<boolean> {
  const used = await getUsage(userId);
  return used + incomingBytes <= QUOTA_BYTES;
}
