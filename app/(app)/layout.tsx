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

  // Account stats for sidebar + topbar
  const accounts = await db.financialAccount.findMany({
    where: { userId: session.user.id },
    select: { lastSyncedAt: true },
  });
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
    >
      {children}
    </DashboardShell>
  );
}
