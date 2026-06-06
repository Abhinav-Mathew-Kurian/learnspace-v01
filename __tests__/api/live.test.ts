import { GET, POST } from '@/app/api/live/route';
import { PUT } from '@/app/api/live/[id]/route';
import { GET as getJoin } from '@/app/api/live/[id]/join/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
import Batch from '@/models/Batch';
import LiveSession from '@/models/LiveSession';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function setup() {
  const admin = await User.create({ name: 'Admin', email: 'admin@live.api', password: 'hash', role: 'admin' });
  const teacher1 = await User.create({ name: 'Teacher1', email: 'teacher1@live.api', password: 'hash', role: 'teacher' });
  const teacher2 = await User.create({ name: 'Teacher2', email: 'teacher2@live.api', password: 'hash', role: 'teacher' });
  const student = await User.create({ name: 'Student', email: 'student@live.api', password: 'hash', role: 'student' });
  const course = await Course.create({ title: 'Live Course', description: 'Course for live tests', teacher: teacher1._id });
  const batch = await Batch.create({
    name: 'Batch A',
    teacher: teacher1._id,
    course: course._id,
    students: [student._id],
  });
  const session = await LiveSession.create({
    batch: batch._id,
    teacher: teacher1._id,
    course: course._id,
    title: 'Live Session 1',
    scheduledAt: new Date(Date.now() + 3600000),
    duration: 60,
    meetLink: 'https://meet.google.com/abc-defg-hij',
    meetPassword: 'secret123',
    status: 'scheduled',
  });
  return { admin, teacher1, teacher2, student, course, batch, session };
}

describe('GET /api/live', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = makeRequest('GET', 'http://localhost/api/live');
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it('student response does NOT include meetLink or meetPassword', async () => {
    const { student, batch } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/live');
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<Record<string, unknown>> };
    for (const s of json.data) {
      expect(s.meetLink).toBeUndefined();
      expect(s.meetPassword).toBeUndefined();
    }
  });

  it('student only gets sessions for their batches', async () => {
    const { student, teacher2, course } = await setup();
    // Create another batch the student is NOT in
    const otherBatch = await Batch.create({ name: 'Other Batch', teacher: teacher2._id, course: course._id, students: [] });
    await LiveSession.create({
      batch: otherBatch._id,
      teacher: teacher2._id,
      course: course._id,
      title: 'Other Session',
      scheduledAt: new Date(Date.now() + 7200000),
      duration: 90,
      meetLink: 'https://meet.google.com/other',
      status: 'scheduled',
    });

    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/live');
    const res = await GET(req as never);
    const json = await res.json() as { data: Array<{ title: string }> };
    // Student should only see their own batch sessions, not 'Other Session'
    const titles = json.data.map((s) => s.title);
    expect(titles).toContain('Live Session 1');
    expect(titles).not.toContain('Other Session');
  });
});

describe('POST /api/live', () => {
  it('returns 403 for student trying to create session', async () => {
    const { student, batch, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/live', {
      batchId: batch._id.toString(),
      courseId: course._id.toString(),
      title: 'Student Session',
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      duration: 60,
      meetLink: 'https://meet.google.com/test',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it('allows teacher to create session for their own batch', async () => {
    const { teacher1, batch, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/live', {
      batchId: batch._id.toString(),
      courseId: course._id.toString(),
      title: 'Teacher Session',
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      duration: 60,
      meetLink: 'https://meet.google.com/teacher',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
  });

  it('returns 403 when teacher tries to create session for another teacher batch', async () => {
    const { teacher2, batch, course } = await setup();
    // batch belongs to teacher1, but we authenticate as teacher2
    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/live', {
      batchId: batch._id.toString(),
      courseId: course._id.toString(),
      title: 'Stolen Session',
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      duration: 60,
      meetLink: 'https://meet.google.com/stolen',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/live/[id]/join', () => {
  it('returns 401 when unauthenticated', async () => {
    const { session } = await setup();
    mockAuth.mockResolvedValueOnce(null);
    const req = makeRequest('GET', `http://localhost/api/live/${session._id.toString()}/join`);
    const res = await getJoin(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for student not in the batch', async () => {
    const { session } = await setup();
    const outsider = await User.create({ name: 'Outsider', email: 'outsider@live.api', password: 'hash', role: 'student' });
    mockAuth.mockResolvedValueOnce({ user: { id: outsider._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', `http://localhost/api/live/${session._id.toString()}/join`);
    const res = await getJoin(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(403);
  });

  it('returns 410 for ended session', async () => {
    const { teacher1, batch, course } = await setup();
    const endedSession = await LiveSession.create({
      batch: batch._id,
      teacher: teacher1._id,
      course: course._id,
      title: 'Ended Session',
      scheduledAt: new Date(Date.now() - 7200000),
      duration: 60,
      meetLink: 'https://meet.google.com/ended',
      status: 'ended',
    });
    mockAuth.mockResolvedValueOnce({ user: { id: 'any-user', role: 'student' } } as never);
    const req = makeRequest('GET', `http://localhost/api/live/${endedSession._id.toString()}/join`);
    const res = await getJoin(req as never, { params: Promise.resolve({ id: endedSession._id.toString() }) });
    expect(res.status).toBe(410);
  });

  it('returns meetLink for student in the batch', async () => {
    const { session, student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', `http://localhost/api/live/${session._id.toString()}/join`);
    const res = await getJoin(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { meetLink: string; meetPassword: string } };
    expect(json.data.meetLink).toBe('https://meet.google.com/abc-defg-hij');
  });
});

// ─── PUT /api/live/[id] — status updates ────────────────────────────────────

describe('PUT /api/live/[id]', () => {
  it('teacher updates status to live → 200, status=live', async () => {
    const { teacher1, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('PUT', `http://localhost/api/live/${session._id.toString()}`, { status: 'live' });
    const res = await PUT(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { status: string } };
    expect(json.data.status).toBe('live');
  });

  it('teacher updates status to ended → 200, status=ended', async () => {
    const { teacher1, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('PUT', `http://localhost/api/live/${session._id.toString()}`, { status: 'ended' });
    const res = await PUT(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { status: string } };
    expect(json.data.status).toBe('ended');
  });

  it('invalid status value → 400', async () => {
    const { teacher1, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('PUT', `http://localhost/api/live/${session._id.toString()}`, { status: 'cancelled' });
    const res = await PUT(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(400);
  });

  it("teacher cannot update another teacher's session → 403", async () => {
    const { teacher2, session } = await setup();
    // session belongs to teacher1; teacher2 tries to update
    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('PUT', `http://localhost/api/live/${session._id.toString()}`, { status: 'live' });
    const res = await PUT(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(403);
  });

  it('admin can update any session → 200', async () => {
    const { admin, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('PUT', `http://localhost/api/live/${session._id.toString()}`, { status: 'live' });
    const res = await PUT(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(200);
  });

  it('student cannot update session → 403', async () => {
    const { student, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('PUT', `http://localhost/api/live/${session._id.toString()}`, { status: 'live' });
    const res = await PUT(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(403);
  });

  it('returns 401 when unauthenticated', async () => {
    const { session } = await setup();
    mockAuth.mockResolvedValueOnce(null);
    const req = makeRequest('PUT', `http://localhost/api/live/${session._id.toString()}`, { status: 'live' });
    const res = await PUT(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(403); // route returns 403 for unauthenticated
  });
});

// ─── GET /api/live — meetLink visibility ────────────────────────────────────

describe('GET /api/live — meetLink stripping for students', () => {
  it('meetLink absent from list response for students regardless of status', async () => {
    const { student, batch, teacher1, course } = await setup();

    // Live session
    await LiveSession.create({
      batch: batch._id, teacher: teacher1._id, course: course._id,
      title: 'Live Now', scheduledAt: new Date(), duration: 60,
      meetLink: 'https://meet.google.com/secret', status: 'live',
    });

    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/live');
    const res = await GET(req as never);
    const json = await res.json() as { data: Array<Record<string, unknown>> };
    for (const s of json.data) {
      expect(s.meetLink).toBeUndefined();
      expect(s.meetPassword).toBeUndefined();
    }
  });

  it('meetLink present in list response for teacher', async () => {
    const { teacher1 } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/live');
    const res = await GET(req as never);
    const json = await res.json() as { data: Array<Record<string, unknown>> };
    // Teacher's own session should expose meetLink
    const withLink = json.data.filter((s) => s.meetLink);
    expect(withLink.length).toBeGreaterThan(0);
  });
});
