type AdvanceResult = { ok: boolean; error?: string };

// Shared helper for onboarding step components: PATCHes /api/onboard with the
// step number plus any per-step payload, returns ok / error.
export async function advanceOnboardingStep(
  step: number,
  payload: Record<string, unknown> = {},
): Promise<AdvanceResult> {
  const res = await fetch('/api/onboard', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ step, ...payload }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: body?.error ?? 'Could not save. Try again.' };
  }
  return { ok: true };
}
