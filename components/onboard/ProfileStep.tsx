'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BBtn, BInput, ArrowIcon, StepHeader } from '@/components/ui';
import { advanceOnboardingStep } from '@/lib/onboard-client';

type Initial = {
  firstName: string | null;
  age: number | null;
  location: string | null;
};

export function ProfileStep({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName ?? '');
  const [age, setAge] = useState(initial.age ? String(initial.age) : '');
  const [location, setLocation] = useState(initial.location ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }

    let ageNum: number | null = null;
    if (age.trim()) {
      const parsed = Number.parseInt(age, 10);
      if (Number.isNaN(parsed) || parsed < 13 || parsed > 120) {
        setError('Enter a valid age between 13 and 120.');
        return;
      }
      ageNum = parsed;
    }

    startTransition(async () => {
      const res = await advanceOnboardingStep(1, {
        firstName: firstName.trim(),
        age: ageNum,
        location: location.trim() || null,
      });
      if (!res.ok) {
        setError(res.error ?? null);
        return;
      }
      router.push('/onboard/2');
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 540, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <StepHeader
        size="xl"
        title="Let's get to know you."
        body="Just the basics. Age and location are optional."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldLabel>First name</FieldLabel>
        <BInput
          value={firstName}
          onChange={setFirstName}
          placeholder="Alex"
          autoFocus
          autoComplete="given-name"
        />

        <div style={{ height: 6 }} />

        <FieldLabel>
          Age <Optional />
        </FieldLabel>
        <BInput
          value={age}
          onChange={setAge}
          placeholder="28"
          inputMode="numeric"
          type="number"
        />

        <div style={{ height: 6 }} />

        <FieldLabel>
          Location <Optional />
        </FieldLabel>
        <BInput
          value={location}
          onChange={setLocation}
          placeholder="San Francisco, CA"
          autoComplete="address-level2"
        />

        {error && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-danger)',
              marginTop: 4,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <BBtn
            variant="primary"
            size="lg"
            onClick={submit}
            disabled={isPending}
            trailing={<ArrowIcon size={16} color="var(--color-mint-ink)" />}
          >
            {isPending ? 'Saving…' : 'Continue'}
          </BBtn>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: 12,
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: -8,
      }}
    >
      {children}
    </label>
  );
}

function Optional() {
  return (
    <span
      style={{
        marginLeft: 6,
        color: 'var(--color-text-faint)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 400,
        textTransform: 'none',
        letterSpacing: 0,
      }}
    >
      optional
    </span>
  );
}
