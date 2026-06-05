'use client';

import { useMemo, useState } from 'react';
import { SparkleIcon } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import type { Composition, HistoryPoint } from '@/lib/networth';

type Props = {
  netWorth: number;
  debt: number;
  accountCount: number;
  composition: Composition;
  history: HistoryPoint[];
  insightLine?: string;
  editing?: boolean;
  onClick?: () => void;
};

const RANGES = [
  { id: '1M', days: 30 },
  { id: '3M', days: 90 },
  { id: '1Y', days: 365 },
  { id: 'All', days: Infinity },
] as const;

type RangeId = (typeof RANGES)[number]['id'];
type ViewId = 'trends' | 'breakdown';

const fmt = (n: number) => formatCurrency(n, { maximumFractionDigits: 0 });
const signedFmt = (n: number) => (n >= 0 ? `+${fmt(n)}` : fmt(n));

export function HeroNetWorth({
  netWorth,
  debt,
  accountCount,
  composition,
  history,
  insightLine,
  editing,
  onClick,
}: Props) {
  const [view, setView] = useState<ViewId>('trends');
  const [range, setRange] = useState<RangeId>('3M');

  const valueColor = netWorth >= 0 ? 'var(--color-text)' : 'var(--color-warn)';
  const subline = (
    <>
      {accountCount} account{accountCount === 1 ? '' : 's'}
      {debt > 0 ? ` · ${fmt(debt)} debt` : ''}
    </>
  );

  const liquidPct = composition.total > 0 ? Math.round((composition.liquid.total / (composition.liquid.total + composition.illiquid.total)) * 100) : 0;
  const compositionInsight = composition.liquid.total + composition.illiquid.total === 0
    ? null
    : `${liquidPct}% of your net worth is liquid. Most of your wealth ${liquidPct < 40 ? 'sits in retirement, which is healthy long-term but hard to tap before then.' : 'is accessible. Building retirement contributions further compounds your long-term position.'}`;

  return (
    <div
      onClick={editing ? onClick : undefined}
      style={{
        background: 'linear-gradient(180deg, var(--color-bg-2), var(--color-bg-1))',
        border: `1px solid ${editing ? 'var(--color-mint)' : 'var(--color-line)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px 20px',
        cursor: editing ? 'pointer' : 'default',
        position: 'relative',
        transition: 'border-color 0.15s',
      }}
    >
      {editing && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.5,
            color: 'var(--color-mint)',
            textTransform: 'uppercase',
          }}
        >
          click to change
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.8,
              color: 'var(--color-text-dim)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Net worth {view === 'breakdown' ? '· Composition' : '· Trend'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 600,
                letterSpacing: -1.4,
                lineHeight: 1,
                color: valueColor,
              }}
            >
              {fmt(netWorth)}
            </div>
            <DeltaLabel history={history} range={range} view={view} />
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-dim)',
            }}
          >
            {subline}
          </div>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div style={{ marginTop: 18 }}>
        {view === 'trends' ? (
          <TrendsView history={history} range={range} onRangeChange={setRange} />
        ) : (
          <BreakdownView composition={composition} />
        )}
      </div>

      {(insightLine ?? compositionInsight) && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid var(--color-line)',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <SparkleIcon size={14} color="var(--color-indigo)" />
          <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {view === 'breakdown' && compositionInsight ? compositionInsight : insightLine}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Toggle ----------

function ViewToggle({ view, onChange }: { view: ViewId; onChange: (v: ViewId) => void }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--color-bg-3)',
        borderRadius: 'var(--radius-sm)',
        padding: 3,
        gap: 2,
      }}
    >
      {(['trends', 'breakdown'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-xs, 4px)',
            border: 'none',
            fontSize: 12,
            fontWeight: 540,
            background: view === v ? 'var(--color-mint)' : 'transparent',
            color: view === v ? 'var(--color-mint-ink)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            textTransform: 'capitalize',
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function DeltaLabel({ history, range, view }: { history: HistoryPoint[]; range: RangeId; view: ViewId }) {
  if (view !== 'trends' && view !== 'breakdown') return null;
  if (history.length < 2) return null;
  const days = view === 'breakdown' ? 90 : RANGES.find((r) => r.id === range)?.days ?? 90;
  const start = history[Math.max(0, history.length - (days === Infinity ? history.length : days))];
  const end = history[history.length - 1];
  if (!start || !end) return null;
  const delta = end.value - start.value;
  const pct = start.value !== 0 ? (delta / Math.abs(start.value)) * 100 : 0;
  const positive = delta >= 0;
  const color = positive ? 'var(--color-mint)' : 'var(--color-warn)';
  const arrow = positive ? '↗' : '↘';
  return (
    <div style={{ fontSize: 14, color, fontWeight: 540, fontFamily: 'var(--font-mono)' }}>
      {arrow} {signedFmt(delta)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
    </div>
  );
}

// ---------- Trends ----------

function TrendsView({
  history,
  range,
  onRangeChange,
}: {
  history: HistoryPoint[];
  range: RangeId;
  onRangeChange: (r: RangeId) => void;
}) {
  const days = RANGES.find((r) => r.id === range)?.days ?? 90;
  const sliced = useMemo(() => {
    if (days === Infinity) return history;
    return history.slice(Math.max(0, history.length - days));
  }, [history, days]);

  return (
    <>
      <Sparkline points={sliced} />
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 8 }}>
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => onRangeChange(r.id)}
            style={{
              padding: '6px 12px',
              background: range === r.id ? 'var(--color-bg-3)' : 'transparent',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              color: range === r.id ? 'var(--color-text)' : 'var(--color-text-dim)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              fontWeight: range === r.id ? 540 : 400,
            }}
          >
            {r.id}
          </button>
        ))}
      </div>
    </>
  );
}

function Sparkline({ points }: { points: HistoryPoint[] }) {
  const height = 100;
  const width = 600;
  const padding = 4;

  if (points.length < 2) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-faint)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.4,
        }}
      >
        not enough history yet
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const xStep = (width - padding * 2) / (points.length - 1);
  const yFor = (v: number) => height - padding - ((v - min) / range) * (height - padding * 2);

  const coords = points.map((p, i) => `${padding + i * xStep},${yFor(p.value)}`);
  const linePath = `M ${coords.join(' L ')}`;
  const areaPath = `${linePath} L ${padding + (points.length - 1) * xStep},${height} L ${padding},${height} Z`;
  const endX = padding + (points.length - 1) * xStep;
  const endY = yFor(points[points.length - 1]!.value);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id="nw-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-mint)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-mint)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#nw-area)" />
      <path d={linePath} fill="none" stroke="var(--color-mint)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={endX} cy={endY} r={4} fill="var(--color-mint)" />
    </svg>
  );
}

// ---------- Breakdown ----------

type Segment = { label: string; value: number; color: string };

function BreakdownView({ composition }: { composition: Composition }) {
  const liquid = composition.liquid;
  const illiquid = composition.illiquid;
  const segments: Segment[] = [
    { label: 'Cash & savings', value: liquid.cashSavings, color: '#7E8BFF' },
    { label: 'Roth IRA', value: liquid.rothIra, color: '#5DA4FF' },
    { label: 'Brokerage', value: liquid.brokerage, color: '#4DC8D0' },
    { label: '401(k) / retirement', value: illiquid.retirement, color: '#FF8587' },
    { label: 'Alternatives', value: illiquid.alternatives, color: '#C089F2' },
  ].filter((s) => s.value > 0);

  const grossTotal = segments.reduce((s, x) => s + x.value, 0);

  const illiquidChildren = [
    { label: '401(k)', value: illiquid.retirement, color: '#FF8587' },
    { label: 'Alternatives', value: illiquid.alternatives, color: '#C089F2' },
  ].filter((c) => c.value > 0);

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
      <Donut segments={segments} total={grossTotal} centerLabel={composition.total} debt={composition.debt} />
      <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <BucketRow
          tint="#7E8BFF"
          label="LIQUID"
          value={liquid.total}
          total={grossTotal}
          children={[
            { label: 'Cash & savings', value: liquid.cashSavings, color: '#7E8BFF' },
            { label: 'Roth IRA', value: liquid.rothIra, color: '#5DA4FF' },
            { label: 'Brokerage', value: liquid.brokerage, color: '#4DC8D0' },
          ].filter((c) => c.value > 0)}
        />
        <BucketRow
          tint="#FF8587"
          label="ILLIQUID"
          value={illiquid.total}
          total={grossTotal}
          children={illiquidChildren}
        />
      </div>
    </div>
  );
}

function Donut({
  segments,
  total,
  centerLabel,
  debt,
}: {
  segments: Segment[];
  total: number;
  centerLabel: number;
  debt: number;
}) {
  const size = 180;
  const radius = 78;
  const innerRadius = 56;
  const c = size / 2;
  let angle = -Math.PI / 2;

  const paths = segments.map((s) => {
    const slice = (s.value / total) * Math.PI * 2;
    const x1 = c + radius * Math.cos(angle);
    const y1 = c + radius * Math.sin(angle);
    const end = angle + slice;
    const x2 = c + radius * Math.cos(end);
    const y2 = c + radius * Math.sin(end);
    const x3 = c + innerRadius * Math.cos(end);
    const y3 = c + innerRadius * Math.sin(end);
    const x4 = c + innerRadius * Math.cos(angle);
    const y4 = c + innerRadius * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${large} 0 ${x4} ${y4} Z`;
    angle = end;
    return { path, color: s.color };
  });

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        {paths.map((p, i) => (
          <path key={i} d={p.path} fill={p.color} />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.6,
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
          }}
        >
          Net Worth
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4, marginTop: 2 }}>
          {fmt(centerLabel)}
        </div>
        {debt > 0 && (
          <div style={{ fontSize: 10.5, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            -{fmt(debt)} debt incl.
          </div>
        )}
      </div>
    </div>
  );
}

function BucketRow({
  tint,
  label,
  value,
  total,
  children,
}: {
  tint: string;
  label: string;
  value: number;
  total: number;
  children: Array<{ label: string; value: number; color: string }>;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--color-line)' }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: tint }} />
        <span style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 0.6, color: 'var(--color-text-dim)' }}>
          {label}
        </span>
        <span style={{ fontSize: 14, fontWeight: 540 }}>{fmt(value)}</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', minWidth: 32, textAlign: 'right' }}>
          {pct}%
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8 }}>
        {children.map((c) => {
          const childPct = total > 0 ? Math.round((c.value / total) * 100) : 0;
          return (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 1.5, background: c.color }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-muted)' }}>{c.label}</span>
              <span style={{ fontSize: 13 }}>{fmt(c.value)}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', minWidth: 32, textAlign: 'right' }}>
                {childPct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
