import { Eyebrow } from '@/components/ui';

type Props = {
  title: string;
  description: string;
  phase: string;
};

export function StubPage({ title, description, phase }: Props) {
  return (
    <div style={{ maxWidth: 640 }}>
      <Eyebrow style={{ marginBottom: 12 }}>{phase}</Eyebrow>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: -0.6,
          margin: '0 0 10px',
          lineHeight: 1.15,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--color-text-muted)',
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}
