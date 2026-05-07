import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { IntegrationsList } from '@/components/settings/IntegrationsList';

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const items = await db.plaidItem.findMany({
    where: { userId: session.user.id },
    include: {
      accounts: { select: { lastSyncedAt: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const shaped = items.map((it) => {
    const lastSyncedAt = it.accounts.reduce<Date | null>((latest, a) => {
      if (!latest || a.lastSyncedAt > latest) return a.lastSyncedAt;
      return latest;
    }, null);
    return {
      id: it.id,
      institutionName: it.institutionName,
      status: it.status,
      accountCount: it.accounts.length,
      lastSyncedAt,
      updatedAt: it.updatedAt,
    };
  });

  return <IntegrationsList items={shaped} />;
}
