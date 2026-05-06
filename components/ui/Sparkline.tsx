type Props = {
  data: number[];
  color: string;
  height?: number;
  showFill?: boolean;
};

export function Sparkline({ data, color, height = 90, showFill = true }: Props) {
  const W = 1000;
  const H = height;
  const pad = 8;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (W - pad * 2),
    pad + (1 - (v - min) / span) * (H - pad * 2),
  ]);

  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  const last = pts[pts.length - 1] ?? [pad, H - pad];
  const fill = `${line} L${last[0].toFixed(1)},${H - pad} L${pad},${H - pad} Z`;

  const gradId = `sf-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((y) => (
        <line
          key={y}
          x1={0}
          x2={W}
          y1={pad + y * (H - pad * 2)}
          y2={pad + y * (H - pad * 2)}
          stroke="var(--color-line)"
          strokeDasharray="2 4"
          strokeWidth="1"
        />
      ))}
      {showFill && <path d={fill} fill={`url(#${gradId})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} />
      <circle cx={last[0]} cy={last[1]} r="9" fill={color} fillOpacity="0.18" />
    </svg>
  );
}
