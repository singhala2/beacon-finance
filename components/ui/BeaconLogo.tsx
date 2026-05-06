import type { CSSProperties } from 'react';

type Props = {
  size?: number;
  color?: string;
  style?: CSSProperties;
};

export function BeaconLogo({ size = 24, color, style }: Props) {
  const c = color ?? 'var(--color-mint)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden
    >
      <path d="M12 3 L12 21" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M5 8 Q12 5 19 8"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <path
        d="M5 13 Q12 10 19 13"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path d="M5 18 Q12 15 19 18" stroke={c} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="3" r="1.6" fill={c} />
    </svg>
  );
}
