'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BeaconLogo,
  CollapseIcon,
  HomeIcon,
  TrendIcon,
  TargetIcon,
  SparkleIcon,
  CheckBoxIcon,
} from '@/components/ui';
import {
  DASHBOARD_NAV,
  activeNavForPath,
  type DashboardNavId,
} from '@/lib/dashboard';
import { UserMenu } from './UserMenu';
import type { RecentChat } from './DashboardShell';

const NAV_ICONS: Record<DashboardNavId, React.ComponentType<{ size?: number; color?: string }>> = {
  home: HomeIcon,
  spending: TrendIcon,
  goals: TargetIcon,
  investments: SparkleIcon,
  plan: CheckBoxIcon,
};

type Props = {
  open: boolean;
  onToggle: () => void;
  user: { firstName: string | null; name: string | null; email: string };
  accountCount: number;
  recentChats: RecentChat[];
};

export function DSidebar({ open, onToggle, user, accountCount, recentChats }: Props) {
  const pathname = usePathname();
  const activeId = activeNavForPath(pathname);
  const initials = (user.firstName ?? user.name ?? user.email)
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  if (!open) {
    return (
      <div
        style={{
          width: 56,
          flexShrink: 0,
          background: 'var(--color-bg-1)',
          borderRight: '1px solid var(--color-line)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 0',
          gap: 4,
        }}
      >
        <button
          onClick={onToggle}
          aria-label="Expand sidebar"
          style={iconBtnStyle()}
        >
          <BeaconLogo size={18} color="var(--color-text)" />
        </button>
        <div style={{ height: 10 }} />
        <Link
          href="/chat"
          title="New chat"
          style={{
            ...iconBtnStyle(),
            background: 'var(--color-bg-3)',
            border: '1px solid var(--color-line-2)',
            textDecoration: 'none',
          }}
        >
          <SparkleIcon size={14} color="var(--color-indigo)" />
        </Link>
        <div style={{ height: 6 }} />
        {DASHBOARD_NAV.map((n) => {
          const Icon = NAV_ICONS[n.id];
          const isActive = n.id === activeId;
          return (
            <Link
              key={n.id}
              href={n.href}
              title={n.label}
              style={{
                ...iconBtnStyle(),
                background: isActive ? 'var(--color-bg-3)' : 'transparent',
                color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                textDecoration: 'none',
              }}
            >
              <Icon size={16} color={isActive ? 'var(--color-text)' : 'var(--color-text-muted)'} />
            </Link>
          );
        })}
        <div style={{ flex: 1 }} />
        <UserMenu user={user} trigger="collapsed" initials={initials} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: 248,
        flexShrink: 0,
        background: 'var(--color-bg-1)',
        borderRight: '1px solid var(--color-line)',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          marginBottom: 14,
        }}
      >
        <BeaconLogo size={18} color="var(--color-text)" />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text)',
            letterSpacing: -0.2,
            flex: 1,
          }}
        >
          Beacon
        </span>
        <button
          onClick={onToggle}
          aria-label="Collapse sidebar"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-dim)',
          }}
        >
          <CollapseIcon size={14} color="var(--color-text-dim)" />
        </button>
      </div>

      <Link
        href="/chat"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          marginBottom: 14,
          background: 'var(--color-bg-3)',
          border: '1px solid var(--color-line-2)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--color-text)',
          fontSize: 13,
          fontWeight: 540,
          textDecoration: 'none',
        }}
      >
        <SparkleIcon size={13} color="var(--color-indigo)" />
        New chat
        <span style={{ flex: 1 }} />
        <kbd
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-faint)',
            padding: '1px 5px',
            borderRadius: 3,
            border: '1px solid var(--color-line)',
          }}
        >
          ⌘K
        </kbd>
      </Link>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 18 }}>
        {DASHBOARD_NAV.map((n) => {
          const Icon = NAV_ICONS[n.id];
          const isActive = n.id === activeId;
          return (
            <Link
              key={n.id}
              href={n.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                background: isActive ? 'var(--color-bg-3)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontSize: 13,
                fontWeight: isActive ? 540 : 400,
                fontFamily: 'var(--font-sans)',
                textDecoration: 'none',
              }}
            >
              <Icon size={15} color={isActive ? 'var(--color-text)' : 'var(--color-text-muted)'} />
              {n.label}
            </Link>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 10.5,
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.6,
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          padding: '0 10px',
          marginBottom: 6,
        }}
      >
        Recent chats
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {recentChats.length === 0 ? (
          <div
            style={{
              padding: '0 10px',
              fontSize: 12,
              color: 'var(--color-text-faint)',
              fontStyle: 'italic',
            }}
          >
            No conversations yet.
          </div>
        ) : (
          recentChats.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '7px 10px',
                gap: 2,
                background: pathname === `/chat/${c.id}` ? 'var(--color-bg-3)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 220,
                }}
              >
                {c.title}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: 'var(--color-text-faint)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {formatRelativeChatTime(new Date(c.updatedAt))}
              </span>
            </Link>
          ))
        )}
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 4,
          borderTop: '1px solid var(--color-line)',
        }}
      >
        <UserMenu user={user} trigger="expanded" initials={initials} />
        <div
          style={{
            fontSize: 10.5,
            color: 'var(--color-text-dim)',
            fontFamily: 'var(--font-mono)',
            padding: '0 10px 4px',
          }}
        >
          {accountCount} account{accountCount === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}

function iconBtnStyle(): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text)',
  };
}

function formatRelativeChatTime(d: Date): string {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }

  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
