import { db } from '@/lib/db';
import { log } from '@/lib/logger';

export type AuditAction =
  | 'auth.signin'
  | 'auth.signout'
  | 'plaid.item.connect'
  | 'plaid.item.disconnect'
  | 'plaid.sync'
  | 'account.update'
  | 'goal.create'
  | 'goal.update'
  | 'goal.delete'
  | 'settings.profile.update'
  | 'data.export'
  | 'account.delete'
  | 'knowledge.document.upload'
  | 'knowledge.document.download'
  | 'knowledge.document.delete'
  | 'knowledge.document.index'
  | 'knowledge.fact.commit'
  | 'knowledge.fact.confirm'
  | 'knowledge.fact.reject';

type LogAuditArgs = {
  userId: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
};

export async function logAudit(args: LogAuditArgs): Promise<void> {
  const { userId, action, targetType, targetId, metadata, req } = args;
  const ip = req ? extractIp(req) : null;
  const userAgent = req?.headers.get('user-agent') ?? null;
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        metadata: (metadata ?? undefined) as object | undefined,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    // Audit failures must not break the user-facing action.
    log.error('logAudit failed', { err, action });
  }
}

function extractIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? null;
  return req.headers.get('x-real-ip');
}
