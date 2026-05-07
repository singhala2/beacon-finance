import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Greeting } from '@/components/dashboard/Greeting';

export default async function DashboardHome() {
  const session = await auth();
  // Layout has already validated, but TS needs the narrow.
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, email: true },
  });
  if (!user) return null;

  return (
    <>
      <Greeting
        firstName={user.firstName}
        email={user.email}
        subline="Cards land in milestones 2B–2E."
      />

      {/* Placeholder card grid — populated in 2B onward */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 12,
          marginTop: 16,
        }}
      >
        <CardSkeleton span={12} height={220} label="Net worth · 2B" />
        <CardSkeleton span={4} height={160} label="Cash flow · 2D" />
        <CardSkeleton span={4} height={160} label="Spending · 2D" />
        <CardSkeleton span={4} height={160} label="Investments · 2B" />
        <CardSkeleton span={6} height={180} label="Goals · 2B" />
        <CardSkeleton span={3} height={180} label="Debt · 2B" />
        <CardSkeleton span={3} height={180} label="Allocation · 2B" />
        <CardSkeleton span={6} height={160} label="Activity · 2D" />
        <CardSkeleton span={6} height={160} label="Beacon's brief · 2E" />
      </div>
    </>
  );
}

function CardSkeleton({
  span,
  height,
  label,
}: {
  span: number;
  height: number;
  label: string;
}) {
  return (
    <div
      style={{
        gridColumn: `span ${span}`,
        height,
        background: 'var(--color-bg-2)',
        border: '1px dashed var(--color-line)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-dim)',
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  );
}
