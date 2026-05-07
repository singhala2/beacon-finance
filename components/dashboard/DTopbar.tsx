'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MenuIcon, CheckIcon } from '@/components/ui';
import { activeNavForPath, formatSyncedAgo } from '@/lib/dashboard';

const PAGE_TITLE: Record<string, string> = {
  home: 'Home',
  spending: 'Spending',
  goals: 'Goals',
  investments: 'Investments',
  plan: 'Plan',
};

type Props = {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  syncedAt: Date | null;
  accountCount: number;
};

export function DTopbar({ sidebarOpen, onOpenSidebar, syncedAt, accountCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editing = searchParams.get('edit') === '1';
  const title = PAGE_TITLE[activeNavForPath(pathname)] ?? 'Home';

  // Customize button only meaningful on the Home dashboard
  const onHome = activeNavForPath(pathname) === 'home';

  function toggleEdit() {
    const next = new URLSearchParams(searchParams.toString());
    if (editing) next.delete('edit');
    else next.set('edit', '1');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 28px',
        borderBottom: '1px solid var(--color-line)',
        background: 'var(--color-bg-1)',
      }}
    >
      {!sidebarOpen && (
        <button
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            marginLeft: -6,
          }}
        >
          <MenuIcon size={14} color="var(--color-text-muted)" />
        </button>
      )}
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.5,
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-text-dim)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: accountCount > 0 ? 'var(--color-mint)' : 'var(--color-text-dim)',
          }}
        />
        {accountCount > 0
          ? `Synced ${formatSyncedAgo(syncedAt)} · ${accountCount} account${accountCount === 1 ? '' : 's'} live`
          : 'No accounts connected'}
      </div>
      <button
        onClick={toggleEdit}
        disabled={!onHome}
        title={onHome ? undefined : 'Customize works on the Home dashboard.'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 11px',
          background: editing ? 'var(--color-mint)' : 'transparent',
          border: `1px solid ${editing ? 'var(--color-mint)' : 'var(--color-line-2)'}`,
          borderRadius: 'var(--radius-sm)',
          cursor: onHome ? 'pointer' : 'not-allowed',
          fontSize: 12.5,
          color: editing ? 'var(--color-mint-ink)' : 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 540,
          opacity: onHome ? 1 : 0.5,
        }}
      >
        {editing && <CheckIcon size={11} color="var(--color-mint-ink)" />}
        {editing ? 'Done' : 'Customize'}
      </button>
    </div>
  );
}
