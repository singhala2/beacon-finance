import { Eyebrow } from '@/components/ui';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ChatPage({ searchParams }: Props) {
  const { q } = await searchParams;

  return (
    <div style={{ maxWidth: 720 }}>
      <Eyebrow style={{ marginBottom: 12 }}>Phase 3</Eyebrow>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: -0.6,
          margin: '0 0 10px',
          lineHeight: 1.15,
        }}
      >
        Ask Beacon
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.55, margin: '0 0 20px' }}>
        Streaming chat with Anthropic, grounded in your full financial picture, lands in Phase 3. Your question is held below until then.
      </p>

      {q && (
        <div
          style={{
            background: 'var(--color-bg-2)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <Eyebrow style={{ marginBottom: 8 }}>your question</Eyebrow>
          <div
            style={{
              fontSize: 15,
              color: 'var(--color-text)',
              lineHeight: 1.5,
            }}
          >
            {q}
          </div>
        </div>
      )}
    </div>
  );
}
