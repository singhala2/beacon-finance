import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { landingForUser, TOTAL_ONBOARDING_STEPS } from '@/lib/onboard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/welcome');

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, name: true, email: true, onboardingStep: true },
  });
  if (!user) redirect('/welcome');

  // Force onboarding completion before showing the dashboard.
  if (user.onboardingStep <= TOTAL_ONBOARDING_STEPS) {
    redirect(landingForUser(user.onboardingStep));
  }

  // Account stats + recent chats for sidebar/topbar — parallel
  const [accounts, recentChats] = await Promise.all([
    db.financialAccount.findMany({
      where: { userId: session.user.id },
      select: { lastSyncedAt: true },
    }),
    db.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: { id: true, title: true, updatedAt: true },
    }),
  ]);

  const accountCount = accounts.length;
  const lastSync = accounts.reduce<Date | null>((latest, a) => {
    if (!latest || a.lastSyncedAt > latest) return a.lastSyncedAt;
    return latest;
  }, null);

  return (
    <DashboardShell
      user={{ firstName: user.firstName, name: user.name, email: user.email }}
      accountCount={accountCount}
      syncedAt={lastSync ? lastSync.toISOString() : null}
      recentChats={recentChats.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt.toISOString(),
      }))}
    >
      {children}
    </DashboardShell>
  );
}
