import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DScreen } from '@/components/onboard/DScreen';
import { ProfileStep } from '@/components/onboard/ProfileStep';
import { ConnectBankStep } from '@/components/onboard/ConnectBankStep';
import { InvestmentsStep } from '@/components/onboard/InvestmentsStep';
import { GoalsStep } from '@/components/onboard/GoalsStep';
import { RiskStep } from '@/components/onboard/RiskStep';
import { AuditStep } from '@/components/onboard/AuditStep';
import { parseStepParam, previousStep, type OnboardingStep } from '@/lib/onboard';
import type { ConnectedAccount } from '@/components/plaid/PlaidLinkButton';
import { CheckIcon, Eyebrow } from '@/components/ui';

type LeftCopy = { eyebrow?: string; heading: string; body: string };

const LEFT_COPY: Record<OnboardingStep, LeftCopy> = {
  1: {
    heading: 'Beacon learns your situation by talking with you.',
    body: 'A few quick questions so we can speak in your terms. Anything you skip you can refine later.',
  },
  2: {
    heading: 'Pull in your day-to-day money.',
    body: 'One secure connection pulls in 12,000+ banks. Read-only by default. Disconnect anytime.',
  },
  3: {
    heading: 'Now your investment accounts.',
    body: 'Brokerages, retirement, crypto. Beacon needs the full picture to spot what is working and what is not.',
  },
  4: {
    eyebrow: 'Conversation',
    heading: 'What are you saving for?',
    body: 'Goals are how Beacon shapes every recommendation. Pick from common ones, or describe yours in plain words.',
  },
  5: {
    heading: 'How aggressive do you want to be?',
    body: 'This shapes your portfolio mix. Adjustable anytime.',
  },
  6: {
    eyebrow: 'First audit',
    heading: 'Here is what I found.',
    body: 'A quick read of your accounts and the first things to act on. Open the dashboard to dig in.',
  },
};

export default async function OnboardStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step: stepRaw } = await params;
  const step = parseStepParam(stepRaw);
  if (!step) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect('/welcome');

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      age: true,
      location: true,
      onboardingStep: true,
      riskTolerance: true,
    },
  });
  if (!user) redirect('/welcome');

  // Resume guard: never let users skip ahead beyond their saved step + 1.
  const maxAllowed = Math.max(1, user.onboardingStep + 1);
  if (step > maxAllowed) {
    redirect(`/onboard/${maxAllowed}`);
  }

  // Load financial accounts for Steps 2, 3, and 6 (audit net worth)
  const financialAccounts =
    step === 2 || step === 3 || step === 6
      ? await db.financialAccount.findMany({
          where: { userId: session.user.id },
          select: {
            id: true,
            institution: true,
            name: true,
            mask: true,
            type: true,
            subtype: true,
            balanceCurrent: true,
            balanceAvailable: true,
            currency: true,
          },
        })
      : [];

  // Load goals for Step 6 audit summary
  const goals =
    step === 6
      ? await db.goal.findMany({
          where: { userId: session.user.id, deletedAt: null },
          select: { name: true, type: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

  const back = previousStep(step);
  const copy = LEFT_COPY[step];

  const bankAccounts: ConnectedAccount[] = financialAccounts
    .filter((a) => a.type === 'depository' || a.type === 'credit')
    .map((a) => ({ ...a }));

  const investmentAccounts: ConnectedAccount[] = financialAccounts
    .filter((a) => a.type === 'investment')
    .map((a) => ({ ...a }));

  // Compute net worth and debt total for audit step
  const netWorth = financialAccounts.reduce((sum, a) => {
    const bal = a.balanceCurrent ?? 0;
    // Credit accounts: balance is amount owed (negative contribution to net worth)
    return sum + (a.type === 'credit' ? -Math.abs(bal) : bal);
  }, 0);

  const debtTotal = financialAccounts
    .filter((a) => a.type === 'credit')
    .reduce((sum, a) => sum + Math.abs(a.balanceCurrent ?? 0), 0);

  return (
    <DScreen
      step={step}
      backHref={back ? `/onboard/${back}` : '/welcome'}
      left={
        <div>
          {copy.eyebrow && (
            <div style={{ marginBottom: 16 }}>
              <Eyebrow color="var(--color-mint)">{copy.eyebrow}</Eyebrow>
            </div>
          )}
          <h2
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: -0.6,
              margin: '0 0 14px',
              lineHeight: 1.15,
            }}
          >
            {copy.heading}
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'var(--color-text-muted)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {copy.body}
          </p>
          {step === 2 && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Read-only by default. Automation is opt-in later.',
                'Credentials never touch our servers.',
                'Disconnect anytime. Your data goes with you.',
              ].map((s) => (
                <div
                  key={s}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span style={{ display: 'inline-flex', marginTop: 2 }}>
                    <CheckIcon size={12} color="var(--color-mint)" />
                  </span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      }
      right={renderStep(step, user, bankAccounts, investmentAccounts, goals, {
        netWorth,
        debtTotal,
        accountCount: financialAccounts.length,
      })}
    />
  );
}

function renderStep(
  step: OnboardingStep,
  user: { firstName: string | null; age: number | null; location: string | null; riskTolerance: number | null },
  bankAccounts: ConnectedAccount[],
  investmentAccounts: ConnectedAccount[],
  goals: { name: string; type: string }[],
  audit: { netWorth: number; debtTotal: number; accountCount: number },
) {
  switch (step) {
    case 1:
      return (
        <ProfileStep
          initial={{
            firstName: user.firstName,
            age: user.age,
            location: user.location,
          }}
        />
      );
    case 2:
      return <ConnectBankStep initial={bankAccounts} />;
    case 3:
      return <InvestmentsStep initial={investmentAccounts} />;
    case 4:
      return <GoalsStep />;
    case 5:
      return <RiskStep initial={user.riskTolerance ?? 0} />;
    case 6:
      return (
        <AuditStep
          data={{
            netWorth: audit.netWorth,
            accountCount: audit.accountCount,
            debtTotal: audit.debtTotal,
            goals,
            riskTolerance: user.riskTolerance,
          }}
        />
      );
  }
}
