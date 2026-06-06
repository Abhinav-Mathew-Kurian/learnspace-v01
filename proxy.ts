import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const roleRoutes: Record<string, string[]> = {
  admin: ['/admin'],
  teacher: ['/teacher'],
  student: ['/student'],
};

export const proxy = auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;

  const isProtected =
    path.startsWith('/admin') ||
    path.startsWith('/teacher') ||
    path.startsWith('/student');

  if (!isProtected) return NextResponse.next();

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  const { role, isBanned, banReason, isActive, subscriptionExpiry } = session.user;

  // Ban check — JWT carries ban status; effect is immediate on next request
  if (isBanned) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'banned');
    loginUrl.searchParams.set('banReason', banReason || 'Your account has been suspended.');
    return NextResponse.redirect(loginUrl);
  }

  // Deactivated account
  if (!isActive) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'deactivated');
    return NextResponse.redirect(loginUrl);
  }

  // Subscription expiry — only students have expiry dates
  if (role === 'student' && subscriptionExpiry) {
    if (new Date() > new Date(subscriptionExpiry)) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'expired');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Role-based route guard
  for (const [r, prefixes] of Object.entries(roleRoutes)) {
    if (prefixes.some((p) => path.startsWith(p)) && role !== r) {
      const redirect = roleRoutes[role]?.[0] ?? '/login';
      return NextResponse.redirect(new URL(`${redirect}/dashboard`, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*'],
};
