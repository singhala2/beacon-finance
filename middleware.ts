import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth?.user;

  // Public routes
  const isPublic =
    pathname === '/welcome' ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/api/auth');

  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/welcome';
    return NextResponse.redirect(url);
  }

  // Authed users hitting public auth pages should bounce to /
  if (isAuthed && (pathname === '/welcome' || pathname.startsWith('/signin'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  // Match all paths except Next assets and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
