import { type NextRequest, NextResponse } from 'next/server';
import { authLimit, extractIp, tooManyRequests } from '@/lib/ratelimit';

// Middleware runs on the Edge runtime where Prisma (database sessions) is not
// available. Check for the session cookie as a lightweight proxy for "authed";
// server components still call auth() + Prisma for real validation.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // IP-based rate limit on auth-mutating endpoints (signin form + magic-link
  // callback) to make password-spray / link-flood brute-force expensive.
  const isAuthMutation =
    req.method === 'POST' && pathname.startsWith('/api/auth/');
  if (isAuthMutation) {
    const rl = await authLimit.limit(extractIp(req));
    if (!rl.success) return tooManyRequests(rl);
  }

  const sessionToken =
    req.cookies.get('authjs.session-token')?.value ??
    req.cookies.get('__Secure-authjs.session-token')?.value;
  const isAuthed = !!sessionToken;

  const isPublic =
    pathname === '/welcome' ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/.well-known/');

  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/welcome';
    return NextResponse.redirect(url);
  }

  // /welcome is allowed for authenticated users (back button from onboarding lands here).
  // /signin is not — redirect authed users away from the auth form.
  if (isAuthed && pathname.startsWith('/signin')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except Next assets and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
