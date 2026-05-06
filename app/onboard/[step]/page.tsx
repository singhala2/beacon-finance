import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DScreen } from '@/components/onboard/DScreen';
import { ProfileStep } from '@/components/onboard/ProfileStep';
import { StepStub } from '@/components/onboard/StepStub';
import { parseStepParam, previousStep, type OnboardingStep } from '@/lib/onboard';

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
    heading: 'What are you working toward?',
    body: 'Pick one to three goals. Beacon plans the contributions and adjusts as life changes.',
  },
  5: {
    heading: 'How do you feel about market swings?',
    body: 'Your risk profile shapes the strategies we suggest. You can change this anytime.',
  },
  6: {
    heading: 'Here is what Beacon learned.',
    body: 'A quick recap before we open your dashboard. Add anything else we should know.',
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
    },
  });
  if (!user) redirect('/welcome');

  // Resume guard: never let users skip ahead beyond their saved step + 1.
  const maxAllowed = Math.max(1, user.onboardingStep + 1);
  if (step > maxAllowed) {
    redirect(`/onboard/${maxAllowed}`);
  }

  const back = previousStep(step);
  const copy = LEFT_COPY[step];

  return (
    <DScreen
      step={step}
      backHref={back ? `/onboard/${back}` : '/welcome'}
      left={
        <div>
          {copy.eyebrow && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-mint)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              {copy.eyebrow}
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
        </div>
      }
      right={renderStep(step, user)}
    />
  );
}

function renderStep(
  step: OnboardingStep,
  user: { firstName: string | null; age: number | null; location: string | null },
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
      return (
        <StepStub
          step={2}
          title="Connect your banks."
          description="Plaid bank connect is wired in milestone 1D. For now, skip ahead and we will pick this up once your Plaid keys are in place."
        />
      );
    case 3:
      return (
        <StepStub
          step={3}
          title="Pull in your investments."
          description="Brokerage and retirement linking is wired in milestone 1D, alongside the bank connect."
        />
      );
    case 4:
      return (
        <StepStub
          step={4}
          title="What are you working toward?"
          description="Goal picker arrives in milestone 1E."
        />
      );
    case 5:
      return (
        <StepStub
          step={5}
          title="How do you feel about market swings?"
          description="Risk-tolerance picker arrives in milestone 1E."
        />
      );
    case 6:
      return (
        <StepStub
          step={6}
          title="Here is what Beacon learned."
          description="The audit summary arrives in milestone 1E. Submitting now will mark onboarding complete."
        />
      );
  }
}
