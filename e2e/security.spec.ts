import { test, expect } from '@playwright/test';
import { test as authTest } from './fixtures/auth';

// ─── Unauthenticated API guards ───────────────────────────────────────────────

test.describe('Security — unauthenticated API access', () => {
  test('GET /api/admin/users → 401 without session', async ({ page }) => {
    const res = await page.request.get('/api/admin/users');
    expect(res.status()).toBe(401);
  });


  test('POST /api/ai/ask → 401 without session', async ({ page }) => {
    const res = await page.request.post('/api/ai/ask', {
      data: { question: 'Test', courseId: 'fakecourse' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/download → 401 without session (no url param)', async ({ page }) => {
    const res = await page.request.get('/api/download');
    expect(res.status()).toBe(401);
  });

  test('GET /api/download with session but non-Cloudinary URL → 400', async ({ page }) => {
    // Route intercept: inject a fake session cookie so the auth() call passes
    // We test at the API level — the URL validation happens AFTER auth.
    // For this public-spec test, just confirm the endpoint rejects bad URLs
    // when called with a valid-looking session (we use the student storage state).
    test.skip(true, 'Requires authenticated request — covered by Jest security.test.ts');
  });

  test('GET /api/download?url=https://evil.com/file.pdf → 400 (non-Cloudinary)', async ({ page }) => {
    // Without auth this gets 401, but we want to confirm the URL validation
    const res = await page.request.get('/api/download?url=https://evil.com/file.pdf');
    // Either 401 (no auth) or 400 (auth + bad url) — must NOT be 200
    expect([400, 401]).toContain(res.status());
  });
});

// ─── Authenticated API: password never in response ───────────────────────────

authTest.describe('Security — password never returned in API responses', () => {
  authTest('GET /api/admin/users — no password field in any user object', async ({ adminPage }) => {
    const res = await adminPage.request.get('/api/admin/users');
    expect(res.status()).toBe(200);
    const body = await res.json() as { data: Array<Record<string, unknown>> };
    for (const user of body.data) {
      expect(user.password).toBeUndefined();
    }
  });

  authTest('GET /api/courses — no password field on any populated teacher', async ({ adminPage }) => {
    const res = await adminPage.request.get('/api/courses');
    expect(res.status()).toBe(200);
    const body = await res.json() as { data: Array<{ teacher?: Record<string, unknown> }> };
    for (const course of body.data) {
      if (course.teacher && typeof course.teacher === 'object') {
        expect(course.teacher.password).toBeUndefined();
      }
    }
  });
});

// ─── Authenticated student: role isolation ────────────────────────────────────

authTest.describe('Security — student role isolation', () => {
  authTest('student GET /api/live — meetLink stripped from all sessions', async ({ studentPage }) => {
    const res = await studentPage.request.get('/api/live');
    expect(res.status()).toBe(200);
    const body = await res.json() as { data: Array<Record<string, unknown>> };
    for (const session of body.data) {
      expect(session.meetLink).toBeUndefined();
      expect(session.meetPassword).toBeUndefined();
    }
  });

  authTest('student POST /api/ai/ask for non-enrolled course → 403', async ({ studentPage }) => {
    const fakeId = '000000000000000000000001';
    const res = await studentPage.request.post('/api/ai/ask', {
      data: { question: 'What is this course?', courseId: fakeId },
    });
    expect(res.status()).toBe(403);
  });

  authTest('student cannot access /api/admin/users → 401', async ({ studentPage }) => {
    const res = await studentPage.request.get('/api/admin/users');
    expect(res.status()).toBe(401);
  });

  authTest('student cannot POST to /api/admin/users → 401', async ({ studentPage }) => {
    const res = await studentPage.request.post('/api/admin/users', {
      data: { name: 'Hacker', email: 'hack@test.com', password: 'pass', role: 'student' },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Download proxy ───────────────────────────────────────────────────────────

authTest.describe('Security — download proxy URL validation', () => {
  authTest('GET /api/download with non-Cloudinary URL → 400', async ({ studentPage }) => {
    const res = await studentPage.request.get('/api/download?url=https://evil.com/steal.pdf');
    expect(res.status()).toBe(400);
  });

  authTest('GET /api/download with javascript: URL → 400', async ({ studentPage }) => {
    const res = await studentPage.request.get('/api/download?url=javascript:alert(1)');
    expect(res.status()).toBe(400);
  });

  authTest('GET /api/download with data: URL → 400', async ({ studentPage }) => {
    const res = await studentPage.request.get('/api/download?url=data:text/html,<h1>xss</h1>');
    expect(res.status()).toBe(400);
  });

  authTest('GET /api/download with no url param → 400', async ({ studentPage }) => {
    const res = await studentPage.request.get('/api/download');
    expect(res.status()).toBe(400);
  });
});
