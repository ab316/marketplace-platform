import { type NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from './lib/auth/session-cookie.ts';

/**
 * Cookie-presence redirects for protected areas. (`proxy.ts` is Next 16's name for what earlier
 * versions called middleware.)
 *
 * **This is user experience, not security** (ADR-011 §4). It only checks that a session cookie
 * exists — not that it is valid, unexpired, unrevoked, or sufficient for the page. Those are
 * decided by the backend on every request, which is the only layer that can see resource
 * ownership and the only one that cannot be bypassed. Middleware has historically been skippable
 * (CVE-2025-29927); nothing here may ever become the sole guard on protected data.
 *
 * The prefix list is empty until Phase 6 adds the first protected route group.
 */
const PROTECTED_PREFIXES: readonly string[] = [];

const proxy = (request: NextRequest): NextResponse => {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const signInUrl = new URL('/sign-in', request.url);
  // Preserved so the user lands where they were going once signed in.
  signInUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(signInUrl);
};

export const config = {
  // Static assets and image optimizer output never need a session check.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

export default proxy;
