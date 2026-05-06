'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BBtn, ArrowIcon } from '@/components/ui';

type Props = {
  step: number;
  title: string;
  description: string;
};

export function StepStub({ step, title, description }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function skip() {
    startTransition(async () => {
      const res = await fetch('/api/onboard', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step }),
      });

      if (!res.ok) return;

      const next = step + 1;
      if (next > 6) {
        router.push('/');
      } else {
        router.push(`/onboard/${next}`);
      }
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 540, width: '100%' }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-text-dim)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        Coming soon
      </div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: -0.8,
          margin: '0 0 8px',
          lineHeight: 1.15,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 15,
          color: 'var(--color-text-muted)',
          lineHeight: 1.55,
          margin: '0 0 28px',
        }}
      >
        {description}
      </p>

      <BBtn
        variant="primary"
        size="lg"
        onClick={skip}
        disabled={isPending}
        trailing={<ArrowIcon size={16} color="var(--color-mint-ink)" />}
      >
        {isPending ? 'Saving…' : step === 6 ? 'Take me to my dashboard' : 'Continue'}
      </BBtn>
    </div>
  );
}
