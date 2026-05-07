import Link from 'next/link';
import { GoalForm } from '@/components/goals/GoalForm';

export default function NewGoalPage() {
  return (
    <div style={{ maxWidth: 640 }}>
      <Link
        href="/goals"
        style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)', textDecoration: 'none' }}
      >
        ← Goals
      </Link>
      <h1
        style={{
          marginTop: 8,
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: -0.6,
          margin: '8px 0 4px',
          lineHeight: 1.1,
        }}
      >
        New goal
      </h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 22px' }}>
        Beacon plans contributions and tracks progress against this goal.
      </p>
      <GoalForm />
    </div>
  );
}
