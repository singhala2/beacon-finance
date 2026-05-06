type IconProps = {
  size?: number;
  color?: string;
};

const make = (path: (color: string) => React.ReactNode, defaultStrokeWidth = 1.4) => {
  void defaultStrokeWidth;
  return ({ size = 16, color = 'currentColor' }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      {path(color)}
    </svg>
  );
};

export const ArrowIcon = make((c) => (
  <path
    d="M3 8h10M9 4l4 4-4 4"
    stroke={c}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
));

export const ArrowUpIcon = make((c) => (
  <path
    d="M5 11L11 5M11 5H6M11 5V10"
    stroke={c}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
));

export const CheckIcon = make((c) => (
  <path
    d="M3 8.5l3 3 7-7"
    stroke={c}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
));

export const ShieldIcon = make((c) => (
  <>
    <path
      d="M8 1l5.5 2v4.5c0 3.5-2.5 6.5-5.5 7.5-3-1-5.5-4-5.5-7.5V3L8 1z"
      stroke={c}
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M5.5 8l2 2 3.5-3.5"
      stroke={c}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
));

export const SparkleIcon = make((c) => (
  <path
    d="M8 1.5l1.5 4 4 1.5-4 1.5L8 12.5 6.5 8.5l-4-1.5 4-1.5L8 1.5z"
    stroke={c}
    strokeWidth="1.3"
    strokeLinejoin="round"
  />
));

export const BankIcon = make((c) => (
  <path
    d="M2 7h12M2 13h12M3 7v6M6 7v6M10 7v6M13 7v6M8 1L1.5 5.5h13L8 1z"
    stroke={c}
    strokeWidth="1.3"
    strokeLinejoin="round"
    strokeLinecap="round"
  />
));

export const ChartIcon = make((c) => (
  <path
    d="M2 13h12M4 11V7M7 11V4M10 11V8M13 11V5"
    stroke={c}
    strokeWidth="1.4"
    strokeLinecap="round"
  />
));

export const HomeIcon = make((c) => (
  <>
    <path d="M2 7l6-5 6 5v7H2V7z" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M6 14V9h4v5" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
  </>
));

export const RetireIcon = make((c) => (
  <>
    <circle cx="8" cy="8" r="6" stroke={c} strokeWidth="1.4" />
    <path d="M8 4v4l3 2" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
  </>
));

export const EmergencyIcon = make((c) => (
  <path
    d="M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M3 13l2-2M11 5l2-2"
    stroke={c}
    strokeWidth="1.4"
    strokeLinecap="round"
  />
));

export const TravelIcon = make((c) => (
  <path
    d="M2 11l5-2 4 4 3-1L8 4 6 5 4 4 2 5l2 3-2 3z"
    stroke={c}
    strokeWidth="1.3"
    strokeLinejoin="round"
  />
));

export const LockIcon = make((c) => (
  <>
    <rect x="2.5" y="7" width="11" height="7" rx="1.5" stroke={c} strokeWidth="1.4" />
    <path d="M5 7V4.5a3 3 0 016 0V7" stroke={c} strokeWidth="1.4" />
  </>
));

export const SendIcon = make((c) => (
  <path
    d="M2 8L14 2l-3 12-3-5-6-1z"
    stroke={c}
    strokeWidth="1.4"
    strokeLinejoin="round"
  />
));

export const PlusIcon = make((c) => (
  <path d="M8 3v10M3 8h10" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
));
