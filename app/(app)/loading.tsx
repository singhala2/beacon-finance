// Renders while any (app) page's server component is fetching. Keeps the
// dashboard shell mounted (sidebar + topbar) and just shows a soft skeleton
// in the content area instead of a blank flash.
export default function AppLoading() {
  return (
    <div
      style={{
        maxWidth: 960,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <SkeletonBlock height={32} width={220} />
      <SkeletonBlock height={14} width={320} />
      <div style={{ height: 8 }} />
      <SkeletonBlock height={120} width="100%" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <SkeletonBlock height={140} width="100%" />
        <SkeletonBlock height={140} width="100%" />
        <SkeletonBlock height={140} width="100%" />
      </div>
    </div>
  );
}

function SkeletonBlock({ height, width }: { height: number; width: number | string }) {
  return (
    <div
      style={{
        height,
        width,
        background: 'var(--color-bg-2)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-md)',
        opacity: 0.55,
      }}
    />
  );
}
