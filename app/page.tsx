import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { landingForUser, TOTAL_ONBOARDING_STEPS } from '@/lib/onboard';

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/welcome');
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, name: true, email: true, onboardingStep: true },
  });

  if (!user) redirect('/welcome');

  if (user.onboardingStep <= TOTAL_ONBOARDING_STEPS) {
    redirect(landingForUser(user.onboardingStep));
  }

  // Onboarding complete. Dashboard arrives in Phase 2.
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--color-bg-0)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: 'var(--color-text-dim)',
            marginBottom: 12,
          }}
        >
          Onboarding complete
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: -0.8,
            margin: '0 0 10px',
          }}
        >
          Welcome to Beacon, {user.firstName ?? user.name ?? user.email}.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-muted)', lineHeight: 1.55, margin: 0 }}>
          Your dashboard arrives in Phase 2.
        </p>
      </div>
    </main>
  );
}
