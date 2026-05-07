import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { GoalForm } from '@/components/goals/GoalForm';

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const goal = await db.goal.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });
  if (!goal) notFound();

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
        {goal.name}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 22px' }}>
        Update the target, timeline, or contribution and Beacon will adjust its projections.
      </p>

      <GoalForm
        initial={{
          id: goal.id,
          name: goal.name,
          type: goal.type as 'emergency' | 'house' | 'retirement' | 'debt' | 'travel' | 'custom',
          targetAmount: goal.targetAmount,
          targetDate: goal.targetDate,
          monthlyContribution: goal.monthlyContribution,
        }}
      />
    </div>
  );
}
