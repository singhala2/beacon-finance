'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BBtn, BInput, Eyebrow } from '@/components/ui';

const TYPES = ['emergency', 'house', 'retirement', 'debt', 'travel', 'custom'] as const;
type GoalType = (typeof TYPES)[number];

const TYPE_LABEL: Record<GoalType, string> = {
  emergency: 'Emergency fund',
  house: 'House',
  retirement: 'Retirement',
  debt: 'Debt payoff',
  travel: 'Travel',
  custom: 'Other',
};

type Initial = {
  id?: string;
  name: string;
  type: GoalType;
  targetAmount: number | null;
  targetDate: Date | null;
  monthlyContribution: number | null;
};

type Props = {
  initial?: Initial;
};

function dateToInput(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

export function GoalForm({ initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<GoalType>(initial?.type ?? 'custom');
  const [targetAmount, setTargetAmount] = useState(
    initial?.targetAmount ? String(initial.targetAmount) : '',
  );
  const [targetDate, setTargetDate] = useState(dateToInput(initial?.targetDate ?? null));
  const [monthlyContribution, setMonthly] = useState(
    initial?.monthlyContribution ? String(initial.monthlyContribution) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError('Give your goal a name.');
      return;
    }

    const amountNum = targetAmount.trim() ? Number.parseFloat(targetAmount) : null;
    if (targetAmount.trim() && (Number.isNaN(amountNum) || amountNum! <= 0)) {
      setError('Target amount must be a positive number.');
      return;
    }
    const monthlyNum = monthlyContribution.trim() ? Number.parseFloat(monthlyContribution) : null;
    if (monthlyContribution.trim() && (Number.isNaN(monthlyNum) || monthlyNum! <= 0)) {
      setError('Monthly contribution must be a positive number.');
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      targetAmount: amountNum ?? undefined,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      monthlyContribution: monthlyNum ?? undefined,
    };

    startTransition(async () => {
      const url = isEdit ? `/api/goals/${initial!.id}` : '/api/goals';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit ? payload : { goal: payload };

      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError('Could not save. Try again.');
        return;
      }
      router.push('/goals');
      router.refresh();
    });
  }

  function deleteGoal() {
    if (!isEdit) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/goals/${initial!.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Could not delete.');
        setConfirmingDelete(false);
        return;
      }
      router.push('/goals');
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <Eyebrow style={{ marginBottom: 6 }}>Name</Eyebrow>
        <BInput value={name} onChange={setName} placeholder="House down payment" autoFocus />
      </div>

      <div>
        <Eyebrow style={{ marginBottom: 6 }}>Type</Eyebrow>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: '6px 12px',
                background:
                  t === type
                    ? 'color-mix(in oklab, var(--color-mint) 12%, transparent)'
                    : 'var(--color-bg-3)',
                border: `1px solid ${t === type ? 'var(--color-mint)' : 'var(--color-line)'}`,
                color: t === type ? 'var(--color-mint)' : 'var(--color-text)',
                borderRadius: 'var(--radius-pill)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>Target amount</Eyebrow>
          <BInput value={targetAmount} onChange={setTargetAmount} placeholder="50000" inputMode="numeric" type="number" />
        </div>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>Target date</Eyebrow>
          <BInput value={targetDate} onChange={setTargetDate} type="date" />
        </div>
      </div>

      <div>
        <Eyebrow style={{ marginBottom: 6 }}>Monthly contribution (optional)</Eyebrow>
        <BInput
          value={monthlyContribution}
          onChange={setMonthly}
          placeholder="500"
          inputMode="numeric"
          type="number"
        />
      </div>

      {error && <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>{error}</div>}

      {confirmingDelete ? (
        <div
          style={{
            padding: 14,
            background: 'color-mix(in oklab, var(--color-warn) 6%, transparent)',
            border: '1px solid color-mix(in oklab, var(--color-warn) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            Delete this goal? Beacon stops planning around it.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BBtn variant="primary" size="md" onClick={deleteGoal} disabled={isPending}>
              {isPending ? 'Deleting…' : 'Yes, delete'}
            </BBtn>
            <BBtn variant="ghost" size="md" onClick={() => setConfirmingDelete(false)} disabled={isPending}>
              Cancel
            </BBtn>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <BBtn variant="primary" size="lg" onClick={submit} disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create goal'}
          </BBtn>
          {isEdit && (
            <BBtn variant="ghost" size="lg" onClick={() => setConfirmingDelete(true)} disabled={isPending}>
              Delete
            </BBtn>
          )}
        </div>
      )}
    </div>
  );
}
