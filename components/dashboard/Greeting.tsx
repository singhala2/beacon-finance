import { greetingForHour, formatGreetingDate } from '@/lib/dashboard';

type Props = {
  firstName: string | null;
  email: string;
  subline?: string;
};

export function Greeting({ firstName, email, subline }: Props) {
  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const name = firstName ?? email.split('@')[0];

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: -0.6,
          color: 'var(--color-text)',
          lineHeight: 1.1,
        }}
      >
        {greeting}, {name}.
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
        {formatGreetingDate(now)}
        {subline ? `. ${subline}` : '.'}
      </div>
    </div>
  );
}
