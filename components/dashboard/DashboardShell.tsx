'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { DSidebar } from './DSidebar';
import { DTopbar } from './DTopbar';

type Props = {
  user: { firstName: string | null; name: string | null; email: string };
  accountCount: number;
  syncedAt: string | null; // ISO string from server
  children: ReactNode;
};

const SIDEBAR_KEY = 'beacon.sidebarOpen';

export function DashboardShell({ user, accountCount, syncedAt, children }: Props) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved === 'closed') setOpen(false);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem(SIDEBAR_KEY, next ? 'open' : 'closed');
  }

  const syncedDate = syncedAt ? new Date(syncedAt) : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: 'var(--color-bg-0)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      <DSidebar open={open} onToggle={toggle} user={user} accountCount={accountCount} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <DTopbar
          sidebarOpen={open}
          onOpenSidebar={() => {
            setOpen(true);
            localStorage.setItem(SIDEBAR_KEY, 'open');
          }}
          syncedAt={syncedDate}
          accountCount={accountCount}
        />
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px 32px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
