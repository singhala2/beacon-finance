import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  body?: ReactNode;
  size?: 'lg' | 'xl'; // lg = onboard step (28px), xl = welcome/signin (32px)
};

export function StepHeader({ title, body, size = 'lg' }: Props) {
  const fontSize = size === 'xl' ? 32 : 28;
  const letterSpacing = size === 'xl' ? -0.8 : -0.7;
  return (
    <>
      <h1
        style={{
          fontSize,
          fontWeight: 600,
          letterSpacing,
          margin: '0 0 6px',
          lineHeight: 1.15,
        }}
      >
        {title}
      </h1>
      {body && (
        <p
          style={{
            color: 'var(--color-text-muted)',
            margin: '0 0 22px',
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          {body}
        </p>
      )}
    </>
  );
}
