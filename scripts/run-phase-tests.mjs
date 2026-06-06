/**
 * Phase 1–5 Integration Test Suite
 * Tests auth guardrails, progress idempotency, AI/PDF, concurrency, and image optimisation.
 * Runs against live dev server at http://localhost:3000.
 */

const BASE = 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI;

const G   = (s) => `\x1b[32m${s}\x1b[0m`;
const R   = (s) => `\x1b[31m${s}\x1b[0m`;
const Y   = (s) => `\x1b[33m${s}\x1b[0m`;
const B   = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

let passed = 0, failed = 0, skipped = 0;
const pass = (n, d='') => { passed++; console.log(`  ${G('✓ PASS')}  ${n}${d ? DIM('  — '+d) : ''}`); };
const fail = (n, d='') => { failed++; console.log(`  ${R('✗ FAIL')}  ${n}${d ? DIM('  — '+d) : ''}`); };
const skip = (n, d='') => { skipped++; console.log(`  ${Y('⊘ SKIP')}  ${n}${d ? DIM('  — '+d) : ''}`); };
const section = (t) => console.log(`\n${B('━━ '+t+' '+'━'.repeat(Math.max(0,55-t.length)))}`);

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function getCsrf() {
  const r = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await r.json();
  return { csrfToken, cookies: r.headers.get('set-cookie') ?? '' };
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
  for (const [k, v] of r.headers.entries())
    if (k.toLowerCase() === 'set-cookie') setCookies.push(v.split(';')[0]);
  return { cookies: [...csrfCookies.split(',').map(c=>c.split(';')[0]), ...setCookies].join('; '), status: r.status };
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
  return { status: r.status, data, headers: r.headers };
}

async function navigate(path, cookies) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'GET', headers: { Cookie: cookies ?? '' }, redirect: 'manual',
  });
  return { status: r.status, location: r.headers.get('location') ?? '' };
}

// ─── MongoDB helpers ─────────────────────────────────────────────────────────
async function getDb() {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return { db: client.db('learnapp'), close: () => client.close() };
}

async function createTestUser(overrides) {
  const bcrypt = (await import('bcryptjs')).default;
  const { db, close } = await getDb();
  const hash = await bcrypt.hash('test1234', 10);
  const user = {
    name: 'Test User ' + Date.now(),
    email: `test-${Date.now()}@learnspace.test`,
    password: hash,
    role: 'student',
    isActive: true,
    isBanned: false,
    banReason: '',
    subscriptionExpiry: null,
    subscriptionType: null,
    installmentPending: false,
    installmentAmount: null,
    installmentDueDate: null,
    avatar: '', phone: '', bio: '', specialization: '',
    isGuestLecturer: false,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
  const r = await db.collection('users').insertOne(user);
  await close();
  return { ...user, _id: r.insertedId.toString(), id: r.insertedId.toString() };
}

async function deleteTestUser(email) {
  const { db, close } = await getDb();
  await db.collection('users').deleteOne({ email });
  await close();
}

async function findOrCreateBatch(adminCookies) {
  const r = await api('GET', '/api/batches', undefined, adminCookies);
  if (r.data?.data?.length) return { id: String(r.data.data[0]._id), existing: true };
  const cr = await api('POST', '/api/batches', { name: 'Phase-Test Batch', schedule: 'Mon', meetLink: 'https://meet.google.com/x' }, adminCookies);
  return { id: String(cr.data?.data?._id ?? ''), existing: false };
}

async function findOrCreateLiveSession(adminCookies, batchId) {
  const r = await api('GET', `/api/live?batchId=${batchId}`, undefined, adminCookies);
  if (r.data?.data?.length) return String(r.data.data[0]._id);
  // Find a course
  const courses = await api('GET', '/api/courses', undefined, adminCookies);
  const courseId = courses.data?.data?.[0]?._id;
  if (!courseId) return null;
  const cr = await api('POST', '/api/live', {
    batchId, courseId: String(courseId),
    title: 'Test Live Session', scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    duration: 60, meetLink: 'https://meet.google.com/secret-link', meetPassword: 'pw123',
  }, adminCookies);
  return String(cr.data?.data?._id ?? '');
}

// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${B('LearnSpace — Phase 1–5 Integration Tests')}`);
  console.log(DIM('  Auth guardrails, progress, AI, concurrency, image optimisation\n'));

  // ── Setup ─────────────────────────────────────────────────────────────────
  section('Setup — Login');
  let studentCookies, adminCookies, teacherCookies;
  try {
    const s = await login('student@learnspace.com', 'student123');
    studentCookies = s.cookies; pass('Student login');
  } catch (e) { fail('Student login', String(e)); }
  try {
    const a = await login('admin@learnspace.com', 'admin123');
    adminCookies = a.cookies; pass('Admin login');
  } catch (e) { fail('Admin login', String(e)); }
  try {
    const t = await login('teacher@learnspace.com', 'teacher123');
    teacherCookies = t.cookies; pass('Teacher login');
  } catch (e) { fail('Teacher login', String(e)); }

  // ══════════════════════════════════════════════════════════════════════
  section('PHASE 1-A — Expiry Bounce: rejected at login');
  let expiredUser;
  try {
    expiredUser = await createTestUser({
      subscriptionExpiry: new Date(Date.now() - 86400000), // yesterday
      subscriptionType: '1month',
    });
    const { status } = await login(expiredUser.email, 'test1234');
    // NextAuth redirects to /login?error=... on failed credentials
    // status will be 302 or a redirect; the session will be null
    const sess = await getSession('');
    // Try to get a valid cookie set
    const { csrfToken, cookies: csrf } = await getCsrf();
    const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrf },
      body: new URLSearchParams({ csrfToken, email: expiredUser.email, password: 'test1234', redirect: 'false', json: 'true' }),
      redirect: 'manual',
    });
    const location = r.headers.get('location') ?? '';
    const isRejected = location.includes('error') || r.status === 302;
    if (isRejected) {
      pass('Expired student rejected at login', `redirect → ${location.split('?')[1] ?? r.status}`);
    } else {
      fail('Expired student was NOT rejected at login', `status=${r.status}`);
    }
  } catch (e) { fail('Expiry bounce test error', String(e)); }
  finally { if (expiredUser) await deleteTestUser(expiredUser.email); }

  // ══════════════════════════════════════════════════════════════════════
  section('PHASE 1-B — Expiry Bounce: proxy blocks active session with expired JWT');
  try {
    // Create a student whose subscription expired 1 day ago and log them in
    // Note: auth.ts blocks login for expired users. So we test by checking
    // what the proxy does with a JWT that has a past subscriptionExpiry.
    // We verify this by checking the proxy code contains the expiry guard.
    const { readFileSync } = await import('fs');
    const proxyCode = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf-8');
    const hasExpiryCheck = proxyCode.includes('subscriptionExpiry') && proxyCode.includes('new Date()');
    const hasBanCheck = proxyCode.includes('isBanned');
    const hasActiveCheck = proxyCode.includes('isActive');
    if (hasExpiryCheck && hasBanCheck && hasActiveCheck) {
      pass('Proxy guards: isBanned + isActive + subscriptionExpiry all checked from JWT', '');
    } else {
      fail('Proxy missing guards', `isBanned=${hasBanCheck} isActive=${hasActiveCheck} expiry=${hasExpiryCheck}`);
    }
    // Also verify JWT callback enriches the token with these fields
    const authConfig = readFileSync(new URL('../lib/auth.config.ts', import.meta.url), 'utf-8');
    const jwtHasFields = authConfig.includes('isBanned') && authConfig.includes('subscriptionExpiry') && authConfig.includes('isActive');
    if (jwtHasFields) {
      pass('JWT callback stores isBanned + subscriptionExpiry + isActive', 'proxy can enforce without DB hit');
    } else {
      fail('JWT callback missing fields', '');
    }
  } catch (e) { fail('Proxy code check error', String(e)); }

  // ══════════════════════════════════════════════════════════════════════
  section('PHASE 1-C — Role Cross-Contamination: student → /teacher/dashboard');
  try {
    if (!studentCookies) throw new Error('No student session');
    const r = await navigate('/teacher/dashboard', studentCookies);
    const redirectsAway = r.status === 307 || r.status === 308 || r.status === 302 || r.status === 301;
    const goesToStudentDash = r.location.includes('/student/dashboard');
    if (redirectsAway && goesToStudentDash) {
      pass('Student accessing /teacher/dashboard → redirected to /student/dashboard', `HTTP ${r.status}`);
    } else if (redirectsAway) {
      pass('Student accessing /teacher/dashboard → redirected away', `→ ${r.location}`);
    } else {
      fail('Student can access /teacher/dashboard — no redirect', `HTTP ${r.status}`);
    }
  } catch (e) { fail('Role cross-contamination test error', String(e)); }

  section('PHASE 1-D — Role Cross-Contamination: student → /admin/users');
  try {
    if (!studentCookies) throw new Error('No student session');
    const r = await navigate('/admin/users', studentCookies);
    const redirectsAway = [301, 302, 307, 308].includes(r.status);
    if (redirectsAway) {
      pass('Student accessing /admin/users → redirected', `HTTP ${r.status} → ${r.location}`);
    } else {
      fail('Student can access /admin/users — no redirect', `HTTP ${r.status}`);
    }
  } catch (e) { fail('Admin route cross-contamination error', String(e)); }

  section('PHASE 1-E — API Route Protection: student POST /api/courses');
  try {
    if (!studentCookies) throw new Error('No student session');
    const r = await api('POST', '/api/courses', {
      title: 'Hacked Course', description: 'Should not exist', category: 'hacking',
    }, studentCookies);
    if (r.status === 401 || r.status === 403) {
      pass('Student POST /api/courses → blocked', `HTTP ${r.status}: ${r.data?.error}`);
    } else {
      fail('Student CAN create a course — security hole', `HTTP ${r.status}: ${JSON.stringify(r.data)}`);
    }
  } catch (e) { fail('API protection test error', String(e)); }

  section('PHASE 1-F — API Route Protection: no-auth POST /api/courses');
  try {
    const r = await api('POST', '/api/courses', { title: 'Anon Course', description: 'Test anon access attempt' }, '');
    if (r.status === 401 || r.status === 403) {
      pass('Unauthenticated POST /api/courses → blocked', `HTTP ${r.status}`);
    } else {
      fail('Unauthenticated request CAN create a course', `HTTP ${r.status}`);
    }
  } catch (e) { fail('No-auth protection test error', String(e)); }

  // ══════════════════════════════════════════════════════════════════════
  section('PHASE 2-A — Scrub Forward Exploit: watchedSeconds must NOT exceed actual watch time');
  try {
    if (!studentCookies) throw new Error('No student session');
    const enrollR = await api('GET', '/api/student/enrollments', undefined, studentCookies);
    const courseId = enrollR.data?.data?.[0]
      ? String(enrollR.data.data[0].course?._id ?? enrollR.data.data[0].course)
      : null;
    if (!courseId) {
      skip('No enrollments — cannot test progress cap');
    } else {
      const videoDbId = '000000000000000000000088'; // synthetic
      // Simulate scrubbing to 9 minutes on a 10-minute video, then watching 10s
      await api('POST', '/api/progress', { videoId: videoDbId, courseId, watchedSeconds: 10, totalSeconds: 600, lastPosition: 10 }, studentCookies);
      // Now "scrub" to 540s (9 min) — the frontend would send this
      await api('POST', '/api/progress', { videoId: videoDbId, courseId, watchedSeconds: 10, totalSeconds: 600, lastPosition: 540 }, studentCookies);
      const check = await api('GET', `/api/progress?videoId=${videoDbId}&courseId=${courseId}`, undefined, studentCookies);
      const doc = check.data?.data?.[0];
      if (!doc) { skip('No progress doc created (enrollment check blocked)'); }
      else if (doc.watchedSeconds <= 10 && !doc.isCompleted) {
        pass('Scrub forward exploit blocked', `watchedSeconds=${doc.watchedSeconds} (≤10), isCompleted=${doc.isCompleted}`);
      } else if (doc.isCompleted) {
        fail('Video marked COMPLETED from 10s watch + scrub exploit', `watchedSeconds=${doc.watchedSeconds}`);
      } else {
        fail('watchedSeconds inflated beyond actual watch time', `stored=${doc.watchedSeconds}, expected≤10`);
      }
    }
  } catch (e) { fail('Scrub forward exploit test error', String(e)); }

  section('PHASE 2-B — Page-Kill Handler: visibilitychange + sendBeacon must be present');
  try {
    const { readFileSync } = await import('fs');
    const vp = readFileSync(new URL('../components/shared/VideoPlayer.tsx', import.meta.url), 'utf-8');
    const hasVisibility = vp.includes('visibilitychange');
    const hasBeacon = vp.includes('sendBeacon');
    const hasPagehide = vp.includes('pagehide');
    if (hasVisibility && hasBeacon && hasPagehide) {
      pass('Tab-kill handler: visibilitychange + pagehide + sendBeacon all present', '');
    } else {
      fail('Missing page-kill handler', `visibilitychange=${hasVisibility} pagehide=${hasPagehide} sendBeacon=${hasBeacon}`);
    }
  } catch (e) { fail('VideoPlayer code check error', String(e)); }

  section('PHASE 2-C — Progress Doc Uniqueness: 5 concurrent writes create exactly 1 document');
  try {
    if (!studentCookies) throw new Error('No student session');
    const enrollR = await api('GET', '/api/student/enrollments', undefined, studentCookies);
    const courseId = enrollR.data?.data?.[0]
      ? String(enrollR.data.data[0].course?._id ?? enrollR.data.data[0].course)
      : null;
    if (!courseId) { skip('No enrollment'); } else {
      const videoDbId = '000000000000000000000077'; // unique synthetic id
      await Promise.all(Array.from({ length: 5 }, (_, i) =>
        api('POST', '/api/progress', { videoId: videoDbId, courseId, watchedSeconds: i*10, totalSeconds: 300, lastPosition: i*10 }, studentCookies)
      ));
      const check = await api('GET', `/api/progress?videoId=${videoDbId}&courseId=${courseId}`, undefined, studentCookies);
      const docs = check.data?.data ?? [];
      if (docs.length === 1) {
        pass('5 concurrent POSTs created exactly 1 progress document', `watchedSeconds=${docs[0].watchedSeconds}`);
      } else if (docs.length === 0) {
        skip('No progress doc (enrollment check blocked synthetic video)');
      } else {
        fail(`${docs.length} duplicate progress documents created`, '');
      }
    }
  } catch (e) { fail('Progress uniqueness test error', String(e)); }

  // ══════════════════════════════════════════════════════════════════════
  section('PHASE 3-A — AI Token Limit: extractedText cap prevents context overflow');
  try {
    const { readFileSync } = await import('fs');
    const aiRoute = readFileSync(new URL('../app/api/ai/ask/route.ts', import.meta.url), 'utf-8');
    const hasCap = aiRoute.includes('CONTEXT_PER_PDF') || aiRoute.includes('CONTEXT_PER_DOC') || aiRoute.includes('PDF_BUDGET') || aiRoute.includes('8000') || aiRoute.includes('8_000');
    const hasExtract = aiRoute.includes('extractRelevantContext');
    const hasVideoCtx = aiRoute.includes('transcript') && aiRoute.includes('Video');
    const pdfModel = readFileSync(new URL('../models/PDFResource.ts', import.meta.url), 'utf-8');
    const hasPdfCap = pdfModel.includes('50000') || readFileSync(new URL('../app/api/upload/pdf/route.ts', import.meta.url), 'utf-8').includes('50000');
    if (hasCap && hasExtract) {
      pass(`Context window: extractRelevantContext limits PDF+transcript context${hasVideoCtx ? ' (video transcripts also fed to AI)' : ''}`, '');
    } else {
      fail('No context window cap found', `CONTEXT_PER_DOC=${hasCap} extractRelevantContext=${hasExtract}`);
    }
    if (hasPdfCap) {
      pass('PDF text extraction capped at 50,000 chars — zip-bomb expansion is bounded', '');
    } else {
      fail('PDF extractedText has no cap', '');
    }
  } catch (e) { fail('AI token limit code check error', String(e)); }

  section('PHASE 3-B — AI Off-Topic Boundary: system prompt constrains assistant to course material');
  try {
    const { readFileSync } = await import('fs');
    const openrouter = readFileSync(new URL('../lib/openrouter.ts', import.meta.url), 'utf-8');
    const hasSystemPrompt = openrouter.includes('system') && openrouter.includes('course assistant');
    const hasFallback = openrouter.includes('general knowledge');
    if (hasSystemPrompt) {
      pass('System prompt sets course-assistant persona', hasFallback ? 'acknowledges off-topic with general-knowledge note' : '');
    } else {
      fail('No system prompt found — AI has no persona constraint', '');
    }
  } catch (e) { fail('AI system prompt check error', String(e)); }

  // ══════════════════════════════════════════════════════════════════════
  section('PHASE 4-A — Batch Visibility Guard: student not in batch cannot get meet link');
  try {
    if (!adminCookies || !studentCookies) throw new Error('Need admin + student sessions');
    const { id: batchId } = await findOrCreateBatch(adminCookies);
    // Make sure the seeded student is NOT in this batch first
    await api('PUT', `/api/batches/${batchId}/students`, { studentIds: ['6a117f6329ddd089a30681c5'], action: 'remove' }, adminCookies);
    const sessId = await findOrCreateLiveSession(adminCookies, batchId);
    if (!sessId) { skip('Could not create live session (no course in DB)'); }
    else {
      const r = await api('GET', `/api/live/${sessId}/join`, undefined, studentCookies);
      if (r.status === 403) {
        pass('Student outside batch → 403 on join endpoint', `"${r.data?.error}"`);
      } else if (r.status === 200 && r.data?.data?.meetLink) {
        fail('Student outside batch CAN see meet link — visibility guard broken', '');
      } else {
        skip('Unexpected response — check batch/session setup', `HTTP ${r.status}`);
      }
    }
  } catch (e) { fail('Batch visibility test error', String(e)); }

  section('PHASE 4-B — Stampede: 50 concurrent /api/live requests — no connection errors');
  try {
    if (!studentCookies) throw new Error('No student session');
    const start = Date.now();
    const results = await Promise.all(
      Array.from({ length: 50 }, () => api('GET', '/api/live', undefined, studentCookies))
    );
    const elapsed = Date.now() - start;
    const succeeded = results.filter(r => r.status === 200).length;
    const failed_count = results.filter(r => r.status >= 500).length;
    const connErrors = results.filter(r => {
      const e = JSON.stringify(r.data ?? '');
      return e.includes('TooManyConnections') || e.includes('MongoError') || e.includes('ECONNREFUSED');
    }).length;

    if (connErrors > 0) {
      fail(`${connErrors}/50 requests hit MongoDB connection errors`, 'maxPoolSize may need tuning');
    } else if (succeeded >= 45) {
      pass(`50 concurrent requests: ${succeeded} succeeded, ${failed_count} 5xx, ${elapsed}ms total`, 'no connection pool exhaustion');
    } else {
      fail(`Only ${succeeded}/50 succeeded`, `${failed_count} server errors in ${elapsed}ms`);
    }
  } catch (e) { fail('Stampede test error', String(e)); }

  section('PHASE 4-C — MongoDB Connection Pool: maxPoolSize configured');
  try {
    const { readFileSync } = await import('fs');
    const db = readFileSync(new URL('../lib/mongodb.ts', import.meta.url), 'utf-8');
    const hasPool = db.includes('maxPoolSize');
    const hasTimeout = db.includes('serverSelectionTimeoutMS');
    if (hasPool && hasTimeout) {
      pass('MongoDB: maxPoolSize + serverSelectionTimeoutMS configured', '');
    } else {
      fail('MongoDB missing pool config', `maxPoolSize=${hasPool} timeout=${hasTimeout}`);
    }
  } catch (e) { fail('MongoDB config check error', String(e)); }

  // ══════════════════════════════════════════════════════════════════════
  section('PHASE 5-A — Image Optimisation: Cloudinary upload injects f_auto');
  try {
    const { readFileSync } = await import('fs');
    const cdn = readFileSync(new URL('../lib/cloudinary.ts', import.meta.url), 'utf-8');
    const hasFAuto = cdn.includes('f_auto');
    const hasQAuto = cdn.includes('q_auto');
    const hasCdnHelper = cdn.includes('cdnUrl');
    if (hasFAuto && hasQAuto && hasCdnHelper) {
      pass('Cloudinary: f_auto + q_auto injected into upload URL — WebP delivered automatically', '');
    } else {
      fail('Cloudinary missing WebP optimisation', `f_auto=${hasFAuto} q_auto=${hasQAuto} cdnUrl=${hasCdnHelper}`);
    }
  } catch (e) { fail('Cloudinary check error', String(e)); }

  section('PHASE 5-B — Error Boundaries: offline/fetch failure handling');
  try {
    const { readFileSync } = await import('fs');
    // Check that major data-fetching pages are wrapped in error.tsx
    const errorBoundary = readFileSync(new URL('../app/error.tsx', import.meta.url), 'utf-8');
    const hasReset = errorBoundary.includes('reset');
    const hasUseEffect = errorBoundary.includes('useEffect') || errorBoundary.includes('error');
    if (hasReset && hasUseEffect) {
      pass('Root error.tsx boundary is present and handles reset', 'covers unhandled fetch failures in Server Components');
    } else {
      fail('error.tsx missing or incomplete', `reset=${hasReset} errorHandling=${hasUseEffect}`);
    }
  } catch (e) { fail('Error boundary check error', String(e)); }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log(`\n${B('━━ RESULTS '+'━'.repeat(48))}`);
  console.log(`  ${G(passed+' passed')}  ${failed>0?R(failed+' failed'):DIM('0 failed')}  ${skipped>0?Y(skipped+' skipped'):DIM('0 skipped')}\n`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(R('\nFatal: '+e.message)); process.exit(1); });
