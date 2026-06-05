import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DataPanel } from '@/components/settings/DataPanel';
import { RecentActivityPanel } from '@/components/settings/RecentActivityPanel';

export default async function SettingsDataPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const entries = await db.auditLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, action: true, targetType: true, metadata: true, createdAt: true },
  });

  const sandboxMode = (process.env.PLAID_ENV ?? 'sandbox') !== 'production';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <DataPanel sandboxMode={sandboxMode} />
      <RecentActivityPanel
        entries={entries.map((e) => ({
          id: e.id,
          action: e.action,
          targetType: e.targetType,
          metadata: e.metadata as Record<string, unknown> | null,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
