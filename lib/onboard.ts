export const TOTAL_ONBOARDING_STEPS = 6;

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

export function isValidStep(value: unknown): value is OnboardingStep {
  return typeof value === 'number' && value >= 1 && value <= TOTAL_ONBOARDING_STEPS;
}

export function parseStepParam(raw: string | undefined): OnboardingStep | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return isValidStep(n) ? (n as OnboardingStep) : null;
}

export function previousStep(current: OnboardingStep): OnboardingStep | null {
  if (current === 1) return null;
  return (current - 1) as OnboardingStep;
}

export function landingForUser(onboardingStep: number): string {
  // 0 = brand new user (post-signin), send to step 1
  // 1-6 = mid-flow, resume there
  // 7 = complete
  if (onboardingStep === 0) return '/onboard/1';
  if (onboardingStep >= 1 && onboardingStep <= TOTAL_ONBOARDING_STEPS) {
    return `/onboard/${onboardingStep}`;
  }
  return '/';
}
