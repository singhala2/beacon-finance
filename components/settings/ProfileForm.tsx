'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BBtn, BInput, Eyebrow } from '@/components/ui';

const RISK_OPTIONS = [
  { value: 1, label: 'Conservative' },
  { value: 2, label: 'Moderately conservative' },
  { value: 3, label: 'Balanced' },
  { value: 4, label: 'Growth' },
  { value: 5, label: 'Aggressive' },
];

type Props = {
  initial: {
    firstName: string | null;
    name: string | null;
    age: number | null;
    location: string | null;
    riskTolerance: number | null;
    email: string;
  };
};

export function ProfileForm({ initial }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName ?? '');
  const [name, setName] = useState(initial.name ?? '');
  const [age, setAge] = useState(initial.age ? String(initial.age) : '');
  const [location, setLocation] = useState(initial.location ?? '');
  const [risk, setRisk] = useState<number | null>(initial.riskTolerance);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const ageNum = age.trim() ? Number.parseInt(age, 10) : null;
      if (age.trim() && (Number.isNaN(ageNum) || ageNum! < 13 || ageNum! > 120)) {
        setError('Enter a valid age between 13 and 120.');
        return;
      }

      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || null,
          name: name.trim() || null,
          age: ageNum,
          location: location.trim() || null,
          riskTolerance: risk,
        }),
      });
      if (!res.ok) {
        setError('Could not save. Try again.');
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <Eyebrow style={{ marginBottom: 6 }}>Email</Eyebrow>
        <div
          style={{
            fontSize: 14,
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            padding: '10px 14px',
            background: 'var(--color-bg-2)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {initial.email}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 4 }}>
          Email is tied to your sign-in and cannot be changed here.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>First name</Eyebrow>
          <BInput value={firstName} onChange={setFirstName} placeholder="Alex" />
        </div>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>Full name (optional)</Eyebrow>
          <BInput value={name} onChange={setName} placeholder="Alex Chen" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>Age</Eyebrow>
          <BInput value={age} onChange={setAge} type="number" inputMode="numeric" placeholder="28" />
        </div>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>Location</Eyebrow>
          <BInput value={location} onChange={setLocation} placeholder="San Francisco, CA" />
        </div>
      </div>

      <div>
        <Eyebrow style={{ marginBottom: 6 }}>Risk profile</Eyebrow>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RISK_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setRisk(o.value)}
              style={{
                padding: '6px 12px',
                background:
                  o.value === risk
                    ? 'color-mix(in oklab, var(--color-mint) 12%, transparent)'
                    : 'var(--color-bg-3)',
                border: `1px solid ${o.value === risk ? 'var(--color-mint)' : 'var(--color-line)'}`,
                color: o.value === risk ? 'var(--color-mint)' : 'var(--color-text)',
                borderRadius: 'var(--radius-pill)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>{error}</div>}
      {savedAt && !error && (
        <div style={{ fontSize: 12, color: 'var(--color-mint)' }}>Saved.</div>
      )}

      <div>
        <BBtn variant="primary" size="md" onClick={save} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </BBtn>
      </div>
    </div>
  );
}
