import { SparkleIcon, Eyebrow } from '@/components/ui';
import { BriefCard } from './BriefCard';
import type { Brief } from '@/lib/insights';

type Props = {
  briefs: Brief[];
};

export function BeaconsBrief({ briefs }: Props) {
  if (briefs.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <SparkleIcon size={14} color="var(--color-indigo)" />
        <Eyebrow>Beacon&apos;s brief · today</Eyebrow>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {briefs.map((b, i) => (
          <BriefCard key={i} tag={b.tag} title={b.title} body={b.body} cta={b.cta} />
        ))}
      </div>
    </div>
  );
}
