export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatGreetingDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatSyncedAgo(at: Date | null): string {
  if (!at) return 'never synced';
  const ms = Date.now() - at.getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min === 1) return '1 min ago';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr === 1) return '1 hour ago';
  if (hr < 24) return `${hr} hours ago`;
  const d = Math.floor(hr / 24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

export type DashboardNavId = 'home' | 'spending' | 'goals' | 'investments' | 'plan' | 'knowledge';

export const DASHBOARD_NAV: { id: DashboardNavId; label: string; href: string }[] = [
  { id: 'home',        label: 'Home',        href: '/' },
  { id: 'spending',    label: 'Spending',    href: '/spending' },
  { id: 'goals',       label: 'Goals',       href: '/goals' },
  { id: 'investments', label: 'Investments', href: '/investments' },
  { id: 'plan',        label: 'Plan',        href: '/plan' },
  { id: 'knowledge',   label: 'Knowledge',   href: '/knowledge' },
];

export function activeNavForPath(pathname: string): DashboardNavId {
  if (pathname.startsWith('/spending')) return 'spending';
  if (pathname.startsWith('/goals')) return 'goals';
  if (pathname.startsWith('/investments')) return 'investments';
  if (pathname.startsWith('/plan')) return 'plan';
  if (pathname.startsWith('/knowledge')) return 'knowledge';
  return 'home';
}
