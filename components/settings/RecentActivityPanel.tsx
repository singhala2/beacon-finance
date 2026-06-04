import { Card } from '@/components/dashboard/Card';
import { Eyebrow } from '@/components/ui';

type Entry = {
  id: string;
  action: string;
  targetType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type Props = {
  entries: Entry[];
};

const ACTION_LABELS: Record<string, string> = {
  'auth.signin': 'Signed in',
  'auth.signout': 'Signed out',
  'plaid.item.connect': 'Connected institution',
  'plaid.item.disconnect': 'Disconnected institution',
  'plaid.sync': 'Synced transactions',
  'account.update': 'Updated account',
  'goal.create': 'Created goal',
  'goal.update': 'Updated goal',
  'goal.delete': 'Deleted goal',
  'settings.profile.update': 'Updated profile',
  'data.export': 'Exported data',
};

function describe(entry: Entry): string {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case 'plaid.item.connect':
      return typeof m.institutionName === 'string'
        ? `${m.institutionName} (${(m.accountCount as number) ?? 0} accounts)`
        : '';
    case 'plaid.item.disconnect':
      return typeof m.institutionName === 'string' ? String(m.institutionName) : '';
    case 'goal.create':
    case 'goal.update':
      return typeof m.name === 'string' ? String(m.name) : '';
    case 'plaid.sync':
      if (typeof m.added === 'number' || typeof m.modified === 'number') {
        const parts: string[] = [];
        if (m.added) parts.push(`+${m.added} added`);
        if (m.modified) parts.push(`${m.modified} modified`);
        if (m.removed) parts.push(`-${m.removed} removed`);
        return parts.join(', ');
      }
      return '';
    default:
      return '';
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function RecentActivityPanel({ entries }: Props) {
  return (
    <Card>
      <Eyebrow style={{ marginBottom: 6 }}>Recent activity</Eyebrow>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
        The last {entries.length === 50 ? '50' : entries.length} actions on your account. Useful for spotting anything unexpected.
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            padding: 20,
            fontSize: 13,
            color: 'var(--color-text-dim)',
            textAlign: 'center',
            border: '1px dashed var(--color-line-2)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          No activity yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {entries.map((e, i) => {
            const detail = describe(e);
            return (
              <div
                key={e.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 2fr 1fr',
                  gap: 12,
                  padding: '10px 0',
                  fontSize: 13,
                  color: 'var(--color-text)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-line)',
                }}
              >
                <div style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                  {ACTION_LABELS[e.action] ?? e.action}
                </div>
                <div style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detail}
                </div>
                <div
                  style={{
                    color: 'var(--color-text-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textAlign: 'right',
                  }}
                >
                  {formatTimestamp(e.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
