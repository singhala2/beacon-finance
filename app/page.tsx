function BeaconLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 L12 21" stroke="var(--color-mint)" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 8 Q12 4 19 8" stroke="var(--color-mint)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M7 12 Q12 9 17 12" stroke="var(--color-mint)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M9 16 Q12 14 15 16" stroke="var(--color-mint)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const name = 'Alex';

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-8">
          <BeaconLogo size={28} />
          <span className="text-[14px] font-semibold tracking-tight text-text">Beacon</span>
        </div>

        <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-text-dim mb-3">
          phase 0 — foundations
        </div>

        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] text-text mb-3">
          Hello, {name}.
        </h1>

        <p className="text-[15px] leading-[1.5] text-text-muted mb-10">
          The design system is loaded. Tokens, fonts, and dark surface scale are wired through Tailwind.
        </p>

        <div className="rounded-[var(--radius-lg)] border border-line bg-bg-2 p-5 mb-4">
          <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-text-dim mb-2">
            net worth
          </div>
          <div className="font-mono text-[32px] font-medium tracking-[-0.02em] text-text mb-1">
            $284,193
          </div>
          <div className="font-mono text-[12px] text-mint">+$3,210 this month</div>
        </div>

        <div className="flex gap-2">
          <span className="rounded-[var(--radius-pill)] bg-mint px-3 py-1 text-[11px] font-semibold text-mint-ink">
            mint
          </span>
          <span className="rounded-[var(--radius-pill)] bg-indigo px-3 py-1 text-[11px] font-semibold text-text">
            indigo
          </span>
          <span className="rounded-[var(--radius-pill)] border border-line-2 px-3 py-1 text-[11px] font-semibold text-text-muted">
            neutral
          </span>
        </div>
      </div>
    </main>
  );
}
