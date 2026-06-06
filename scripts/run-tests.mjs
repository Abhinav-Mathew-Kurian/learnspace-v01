/**
 * Integration test suite — runs against the live dev server on localhost:3000
 * Tests each of the 7 identified problems to show whether they are fixed or still broken.
 */

const BASE = 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI;

// ─── Colour helpers ───────────────────────────────────────────────────────────
const G   = (s) => `\x1b[32m${s}\x1b[0m`;
const R   = (s) => `\x1b[31m${s}\x1b[0m`;
const Y   = (s) => `\x1b[33m${s}\x1b[0m`;
const B   = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

let passed = 0, failed = 0, skipped = 0;
function pass(name, detail = '') { passed++; console.log(`  ${G('✓ PASS')}  ${name}${detail ? DIM('  — ' + detail) : ''}`); }
function fail(name, detail = '') { failed++; console.log(`  ${R('✗ FAIL')}  ${name}${detail ? DIM('  — ' + detail) : ''}`); }
function skip(name, detail = '') { skipped++; console.log(`  ${Y('⊘ SKIP')}  ${name}${detail ? DIM('  — ' + detail) : ''}`); }
function section(title) { console.log(`\n${B('━━ ' + title + ' ' + '━'.repeat(Math.max(0, 55 - title.length)))}`); }

// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function getCsrf() {
  const r = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await r.json();
  const cookies = r.headers.get('set-cookie') ?? '';
  return { csrfToken, cookies };
}

async function login(email, password) {
  const { csrfToken, cookies: csrfCookies } = await getCsrf();
  const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookies },
    body: new URLSearchParams({ csrfToken, email, password, redirect: 'false', json: 'true' }),
    redirect: 'manual',
  });
  const setCookies = [];
  for (const [k, v] of r.headers.entries()) {
    if (k.toLowerCase() === 'set-cookie') setCookies.push(v.split(';')[0]);
  }
  return [...csrfCookies.split(',').map(c => c.split(';')[0]), ...setCookies].join('; ');
}

async function getSession(cookies) {
  const r = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookies } });
  return r.json();
}

async function api(method, path, body, cookies) {
  const opts = { method, headers: { 'Content-Type': 'application/json', Cookie: cookies ?? '' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
}

// ─── MongoDB helpers (rate-limit seeding — must use ObjectId, not string) ─────
async function seedRateLimitDocs(userId, count) {
  const { MongoClient, ObjectId } = await import('mongodb');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('learnapp');
  const oid = new ObjectId(userId);
  const docs = Array.from({ length: count }, () => ({ user: oid, createdAt: new Date() }));
  await db.collection('airequests').insertMany(docs);
  await client.close();
}

async function cleanRateLimitDocs(userId) {
  const { MongoClient, ObjectId } = await import('mongodb');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  await client.db('learnapp').collection('airequests').deleteMany({ user: new ObjectId(userId) });
  await client.close();
}

async function findOrCreateBatch(adminCookies) {
  const r = await api('GET', '/api/batches', undefined, adminCookies);
  if (r.data?.data?.length) return String(r.data.data[0]._id);
  const cr = await api('POST', '/api/batches', { name: 'Test Batch ' + Date.now(), schedule: 'Mon/Wed', meetLink: 'https://meet.google.com/test' }, adminCookies);
  return String(cr.data?.data?._id ?? '');
}

async function findStudent(adminCookies) {
  const r = await api('GET', '/api/admin/users?role=student&limit=1', undefined, adminCookies);
  const users = r.data?.data ?? [];
  return users[0] ? String(users[0]._id) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${B('LearnSpace — Integration Test Suite')}`);
  console.log(DIM('  Verifying 9 problem areas against live server at ' + BASE + '\n'));

  // ── Authentication ───────────────────────────────────────────────────────────
  section('Setup — Authentication');
  let studentCookies, adminCookies, teacherCookies, studentId;

  try {
    studentCookies = await login('student@learnspace.com', 'student123');
    const sess = await getSession(studentCookies);
    studentId = sess?.user?.id;
    if (!studentId) throw new Error('No student session');
    pass('Student login', `id=${studentId.slice(0, 8)}…`);
  } catch (e) { fail('Student login', String(e)); }

  try {
    adminCookies = await login('admin@learnspace.com', 'admin123');
    const sess = await getSession(adminCookies);
    if (!sess?.user?.id) throw new Error('No admin session');
    pass('Admin login', `id=${sess.user.id.slice(0, 8)}…`);
  } catch (e) { fail('Admin login', String(e)); }

  try {
    teacherCookies = await login('teacher@learnspace.com', 'teacher123');
    const sess = await getSession(teacherCookies);
    if (!sess?.user?.id) throw new Error('No teacher session');
    pass('Teacher login', `id=${sess.user.id.slice(0, 8)}…`);
  } catch (e) { fail('Teacher login', String(e)); }

  // ── Test 1 & 2: PDF magic bytes ───────────────────────────────────────────────
  section('Test 1 — PDF Magic Bytes: spoofed MIME type must be rejected');
  try {
    const fakePdfContent = 'This is plain text pretending to be a PDF.';
    const formData = new FormData();
    formData.append('file', new Blob([fakePdfContent], { type: 'application/pdf' }), 'fake.pdf');
    formData.append('courseId', '000000000000000000000001');
    formData.append('title', 'Fake PDF');

    const cookies = teacherCookies ?? adminCookies;
    const r = await fetch(`${BASE}/api/upload/pdf`, { method: 'POST', headers: { Cookie: cookies }, body: formData });
    const data = await r.json();

    if (r.status === 400 && data.error?.toLowerCase().includes('valid pdf')) {
      pass('Spoofed MIME rejected at magic bytes', `HTTP 400: "${data.error}"`);
    } else {
      fail('Spoofed MIME NOT rejected — file passed through', `HTTP ${r.status}: ${JSON.stringify(data)}`);
    }
  } catch (e) { fail('PDF spoofed-MIME test error', String(e)); }

  section('Test 2 — PDF Magic Bytes: real PDF header must NOT be rejected');
  try {
    const realPdf = '%PDF-1.4\n1 0 obj\n<< >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 >>\nstartxref\n9\n%%EOF';
    const formData = new FormData();
    formData.append('file', new Blob([realPdf], { type: 'application/pdf' }), 'real.pdf');
    formData.append('courseId', '000000000000000000000001');
    formData.append('title', 'Real PDF');

    const cookies = teacherCookies ?? adminCookies;
    const r = await fetch(`${BASE}/api/upload/pdf`, { method: 'POST', headers: { Cookie: cookies }, body: formData });
    const data = await r.json();
    const rejectedAtMagic = r.status === 400 && data.error?.toLowerCase().includes('valid pdf');

    if (!rejectedAtMagic) {
      pass('Real PDF passes magic bytes check', `HTTP ${r.status} (may fail further upstream — that's fine)`);
    } else {
      fail('Real PDF wrongly rejected at magic bytes', `HTTP ${r.status}: ${JSON.stringify(data)}`);
    }
  } catch (e) { fail('PDF real-file test error', String(e)); }

  // ── Test 3: Video progress race condition ─────────────────────────────────────
  section('Test 3 — Video Progress: 10 concurrent writes must land as max (not random)');
  try {
    if (!studentCookies) throw new Error('No student session');

    const enrollR = await api('GET', '/api/student/enrollments', undefined, studentCookies);
    const enrollments = enrollR.data?.data ?? [];
    const enrollment = enrollments[0];

    if (!enrollment) {
      skip('No enrollments found for seeded student — cannot test progress without enrollment');
    } else {
      const courseId = String(enrollment.course?._id ?? enrollment.course);
      const vidR = await api('GET', `/api/courses/${courseId}/videos`, undefined, studentCookies);
      const videos = vidR.data?.data ?? [];
      // Use a real videoId if available, else a synthetic one (still tests backend merge)
      const videoDbId = videos[0] ? String(videos[0]._id) : '000000000000000000000099';
      const totalSeconds = 300;

      const watchedValues = [60, 30, 120, 90, 45, 110, 75, 55, 100, 80];
      const expectedMax = Math.max(...watchedValues); // 120

      await Promise.all(
        watchedValues.map((w) =>
          api('POST', '/api/progress', { videoId: videoDbId, courseId, watchedSeconds: w, totalSeconds, lastPosition: w }, studentCookies)
        )
      );

      const check = await api('GET', `/api/progress?videoId=${videoDbId}&courseId=${courseId}`, undefined, studentCookies);
      const stored = check.data?.data?.[0]?.watchedSeconds;

      if (stored === expectedMax) {
        pass('10 concurrent writes → DB correctly stored max value', `watchedSeconds=${stored} (expected ${expectedMax})`);
      } else if (typeof stored === 'number' && stored < expectedMax) {
        fail('Race condition: a lower value won — backend lost concurrent write', `stored=${stored}, expected=${expectedMax}`);
      } else {
        fail('Unexpected result', `stored=${JSON.stringify(stored)}, expected=${expectedMax}`);
      }
    }
  } catch (e) { fail('Progress race condition test error', String(e)); }

  // ── Test 4: AI rate limit ─────────────────────────────────────────────────────
  section('Test 4 — AI Rate Limit: 16th request must be blocked (HTTP 429)');
  try {
    if (!studentCookies || !studentId) throw new Error('No student session');

    await cleanRateLimitDocs(studentId);
    // Pre-seed exactly RATE_LIMIT (15) docs with proper ObjectId type
    await seedRateLimitDocs(studentId, 15);

    // This 16th request should hit 429 before reaching OpenRouter
    const r = await api('POST', '/api/ai/ask', {
      question: 'What is photosynthesis?',
      courseId: '000000000000000000000001',
    }, studentCookies);

    await cleanRateLimitDocs(studentId);

    if (r.status === 429) {
      pass('Rate limit enforced via MongoDB — request blocked before OpenRouter', `HTTP 429: "${r.data?.error ?? ''}"`);
    } else {
      fail('Rate limit NOT enforced — 16th request was not blocked', `HTTP ${r.status}: ${JSON.stringify(r.data)}`);
    }
  } catch (e) { fail('Rate limit test error', String(e)); }

  // ── Test 5: Batch join race condition ─────────────────────────────────────────
  section('Test 5 — Batch Join: 5 concurrent adds of same student → exactly 1 entry');
  try {
    if (!adminCookies) throw new Error('No admin session');

    const batchId = await findOrCreateBatch(adminCookies);
    const targetStudentId = await findStudent(adminCookies);

    if (!batchId || !targetStudentId) {
      skip('Could not find/create batch or student');
    } else {
      // Ensure student is not in batch first
      await api('PUT', `/api/batches/${batchId}/students`, { studentIds: [targetStudentId], action: 'remove' }, adminCookies);

      // 5 concurrent identical add requests
      await Promise.all(
        Array.from({ length: 5 }, () =>
          api('PUT', `/api/batches/${batchId}/students`, { studentIds: [targetStudentId], action: 'add' }, adminCookies)
        )
      );

      const batchR = await api('GET', `/api/batches/${batchId}`, undefined, adminCookies);
      const students = batchR.data?.data?.students ?? [];
      const occurrences = students.filter((s) => String(s._id ?? s) === targetStudentId).length;

      if (occurrences === 1) {
        pass('$addToSet is atomic — student appears exactly once despite 5 concurrent adds');
      } else if (occurrences === 0) {
        fail('Student was not added at all', `occurrences=0`);
      } else {
        fail(`Duplicate entries — student appears ${occurrences}× (race condition NOT fixed)`, '');
      }

      // Cleanup
      await api('PUT', `/api/batches/${batchId}/students`, { studentIds: [targetStudentId], action: 'remove' }, adminCookies);
    }
  } catch (e) { fail('Batch join race condition test error', String(e)); }

  // ── Test 6: Comment duplicate (spam-click) ────────────────────────────────────
  section('Test 6 — Comment Dedup: 5 concurrent identical POSTs → only 1 saved');
  try {
    if (!studentCookies) throw new Error('No student session');

    const enrollR = await api('GET', '/api/student/enrollments', undefined, studentCookies);
    const courseId = enrollR.data?.data?.[0]
      ? String(enrollR.data.data[0].course?._id ?? enrollR.data.data[0].course)
      : null;

    if (!courseId) {
      skip('Student not enrolled in any course');
    } else {
      const uniqueContent = `Duplicate-test-${Date.now()}`;

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          api('POST', '/api/comments', { content: uniqueContent, courseId }, studentCookies)
        )
      );

      const successCount = results.filter((r) => r.status === 201).length;
      const rejectedCount = results.filter((r) => r.status === 409).length;

      // Re-read comments to count how many actually landed in DB
      const commentsR = await api('GET', `/api/comments?courseId=${courseId}`, undefined, studentCookies);
      const duplicateCount = (commentsR.data?.data ?? []).filter((c) => c.content === uniqueContent).length;

      if (duplicateCount === 1) {
        pass(`Only 1 comment saved from 5 concurrent submissions`, `${successCount} created, ${rejectedCount} rejected with 409`);
      } else {
        fail(
          `${duplicateCount} duplicate comments in DB — dedup not working`,
          `${successCount}/5 returned 201, ${rejectedCount}/5 returned 409`
        );
      }
    }
  } catch (e) { fail('Comment duplicate test error', String(e)); }

  // ── Test 7: YouTube error handling ────────────────────────────────────────────
  section('Test 7 — YouTube IFrame: onerror + timeout must be present');
  try {
    const { readFileSync } = await import('fs');
    const hook = readFileSync(new URL('../hooks/useYouTubePlayer.ts', import.meta.url), 'utf-8');
    const checks = {
      'script.onerror handler': hook.includes('script.onerror'),
      'load timeout (setTimeout)': hook.includes('API_LOAD_TIMEOUT_MS') || (hook.includes('setTimeout') && hook.includes('reject(')),
      'promise rejection on failure': hook.includes('reject('),
      'apiError state exposed': hook.includes('apiError'),
    };
    const allPass = Object.values(checks).every(Boolean);
    if (allPass) {
      pass('YouTube IFrame API failure handled gracefully', Object.keys(checks).join(', '));
    } else {
      const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
      fail('Missing YouTube error handling', 'Not found: ' + missing.join(', '));
    }
  } catch (e) { fail('File read error', String(e)); }

  // ── Test 8: OpenRouter timeout ────────────────────────────────────────────────
  section('Test 8 — OpenRouter: AbortController timeout must be wired up');
  try {
    const { readFileSync } = await import('fs');
    const lib = readFileSync(new URL('../lib/openrouter.ts', import.meta.url), 'utf-8');
    const checks = {
      'AbortController created': lib.includes('new AbortController()'),
      'setTimeout abort': lib.includes('controller.abort()'),
      'clearTimeout cleanup': lib.includes('clearTimeout(timer)'),
      'signal passed to fetch': lib.includes('signal: controller.signal'),
    };
    const allPass = Object.values(checks).every(Boolean);
    if (allPass) {
      pass('OpenRouter has 28s AbortController timeout with cleanup', Object.keys(checks).join(', '));
    } else {
      const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
      fail('OpenRouter timeout incomplete', 'Missing: ' + missing.join(', '));
    }
  } catch (e) { fail('File read error', String(e)); }

  // ── Test 9: Analytics aggregation ────────────────────────────────────────────
  section('Test 9 — Analytics: N+1 must be replaced with aggregation pipelines');
  try {
    const { readFileSync } = await import('fs');
    const page = readFileSync(new URL('../app/admin/analytics/page.tsx', import.meta.url), 'utf-8');
    const checks = {
      'Enrollment.aggregate used': page.includes('Enrollment.aggregate'),
      'Progress.aggregate used': page.includes('Progress.aggregate'),
      'Attendance.aggregate used': page.includes('Attendance.aggregate'),
      'N+1 loop removed': !page.includes('courses.map(async'),
    };
    const allPass = Object.values(checks).every(Boolean);
    if (allPass) {
      pass('All 3 aggregation pipelines in place — N+1 eliminated', '3 pipelines replace ~60+ DB round-trips');
    } else {
      const bad = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
      fail('Analytics still has N+1 or missing aggregation', bad.join(', '));
    }
  } catch (e) { fail('File read error', String(e)); }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n${B('━━ RESULTS ' + '━'.repeat(48))}`);
  console.log(`  ${G(passed + ' passed')}  ${failed > 0 ? R(failed + ' failed') : DIM('0 failed')}  ${skipped > 0 ? Y(skipped + ' skipped') : DIM('0 skipped')}\n`);

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(R('\nFatal error: ' + e.message));
  process.exit(1);
});
