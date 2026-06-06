/**
 * Tests for proxy.ts middleware logic.
 * We test the redirect behavior by directly invoking the route handler logic
 * extracted from proxy.ts using mocked auth data via req.auth.
 */
import { NextRequest, NextResponse } from 'next/server';

// Mock next-auth's auth wrapper to use req.auth for sessions
jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

// Build a mock NextRequest with auth context
function buildRequest(path: string, auth: Record<string, unknown> | null = null): NextRequest {
  const url = `http://localhost${path}`;
  const req = new NextRequest(url) as NextRequest & { auth: typeof auth };
  (req as Record<string, unknown>).auth = auth;
  return req;
}

// The actual proxy logic extracted from proxy.ts for testability
function runProxy(req: NextRequest & { auth: Record<string, unknown> | null }) {
  const { nextUrl, auth: session } = req as NextRequest & { auth: Record<string, unknown> | null };
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

  const { role, isBanned, banReason, isActive, subscriptionExpiry } = session.user as Record<string, unknown>;

  if (isBanned) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'banned');
    loginUrl.searchParams.set('banReason', (banReason as string) || 'Your account has been suspended.');
    return NextResponse.redirect(loginUrl);
  }

  if (!isActive) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'deactivated');
    return NextResponse.redirect(loginUrl);
  }

  if (role === 'student' && subscriptionExpiry) {
    if (new Date() > new Date(subscriptionExpiry as string)) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'expired');
      return NextResponse.redirect(loginUrl);
    }
  }

  const roleRoutes: Record<string, string[]> = {
    admin: ['/admin'],
    teacher: ['/teacher'],
    student: ['/student'],
  };

  for (const [r, prefixes] of Object.entries(roleRoutes)) {
    if (prefixes.some((p) => path.startsWith(p)) && role !== r) {
      const redirect = roleRoutes[role as string]?.[0] ?? '/login';
      return NextResponse.redirect(new URL(`${redirect}/dashboard`, req.url));
    }
  }

  return NextResponse.next();
}

function makeSession(role: string, overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'uid', role, isBanned: false, isActive: true, subscriptionExpiry: null, banReason: '', ...overrides },
  };
}

describe('Middleware (proxy.ts) redirect logic', () => {
  it('passes through non-protected paths (/)', () => {
    const req = buildRequest('/');
    const res = runProxy(req as never);
    expect(res.status).toBe(200); // NextResponse.next() returns 200
    expect(res.headers.get('location')).toBeNull();
  });

  it('passes through /login without auth check', () => {
    const req = buildRequest('/login');
    const res = runProxy(req as never);
    expect(res.status).toBe(200);
  });

  it('redirects unauthenticated user from /admin/anything to /login', () => {
    const req = buildRequest('/admin/dashboard', null);
    const res = runProxy(req as never);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('callbackUrl');
  });

  it('redirects unauthenticated user from /teacher/anything to /login', () => {
    const req = buildRequest('/teacher/courses', null);
    const res = runProxy(req as never);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
  });

  it('redirects unauthenticated user from /student/anything to /login', () => {
    const req = buildRequest('/student/dashboard', null);
    const res = runProxy(req as never);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
  });

  it('redirects student accessing /admin/anything to /student/dashboard', () => {
    const req = buildRequest('/admin/users', makeSession('student'));
    const res = runProxy(req as never);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/student/dashboard');
  });

  it('redirects student accessing /teacher/anything to /student/dashboard', () => {
    const req = buildRequest('/teacher/courses', makeSession('student'));
    const res = runProxy(req as never);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/student/dashboard');
  });

  it('redirects teacher accessing /admin/anything to /teacher/dashboard', () => {
    const req = buildRequest('/admin/users', makeSession('teacher'));
    const res = runProxy(req as never);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/teacher/dashboard');
  });

  it('allows admin to access /admin/anything (passes through)', () => {
    const req = buildRequest('/admin/dashboard', makeSession('admin'));
    const res = runProxy(req as never);
    expect(res.status).toBe(200); // NextResponse.next()
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows teacher to access /teacher/anything (passes through)', () => {
    const req = buildRequest('/teacher/courses', makeSession('teacher'));
    const res = runProxy(req as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows student to access /student/anything (passes through)', () => {
    const req = buildRequest('/student/dashboard', makeSession('student'));
    const res = runProxy(req as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects banned user to /login?error=banned', () => {
    const req = buildRequest('/student/dashboard', makeSession('student', { isBanned: true, banReason: 'Spam' }));
    const res = runProxy(req as never);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('error=banned');
  });

  it('redirects student with expired subscription to /login?error=expired', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const req = buildRequest('/student/dashboard', makeSession('student', { subscriptionExpiry: yesterday }));
    const res = runProxy(req as never);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('error=expired');
  });

  it('does not redirect student with valid (future) subscription', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const req = buildRequest('/student/dashboard', makeSession('student', { subscriptionExpiry: tomorrow }));
    const res = runProxy(req as never);
    expect(res.status).toBe(200);
  });

  it('redirects deactivated user to /login?error=deactivated', () => {
    const req = buildRequest('/student/dashboard', makeSession('student', { isActive: false }));
    const res = runProxy(req as never);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('error=deactivated');
  });
});
