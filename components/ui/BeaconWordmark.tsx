import { BeaconLogo } from './BeaconLogo';

type Props = {
  size?: number;
  color?: string;
};

export function BeaconWordmark({ size = 18, color }: Props) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <BeaconLogo size={size + 4} color={color} />
      <span
        style={{
          fontSize: size,
          fontWeight: 600,
          letterSpacing: -0.4,
          color: color ?? 'var(--color-text)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Beacon
      </span>
    </div>
  );
}
