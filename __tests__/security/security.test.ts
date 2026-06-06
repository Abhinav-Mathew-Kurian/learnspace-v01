import { GET as getAdminUsers, POST as postAdminUsers } from '@/app/api/admin/users/route';
import { GET as getProgress } from '@/app/api/progress/route';
import { PATCH as patchCourse, DELETE as deleteCourse } from '@/app/api/courses/[id]/route';
import { GET as getJoin } from '@/app/api/live/[id]/join/route';
import { GET as getDownload } from '@/app/api/download/route';
import { POST as postAi } from '@/app/api/ai/ask/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Progress from '@/models/Progress';
import Enrollment from '@/models/Enrollment';
import Batch from '@/models/Batch';
import LiveSession from '@/models/LiveSession';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function setupUsers() {
  const admin = await User.create({ name: 'Admin', email: 'admin@security.test', password: 'hash', role: 'admin' });
  const teacher1 = await User.create({ name: 'Teacher1', email: 'teacher1@security.test', password: 'hash', role: 'teacher' });
  const teacher2 = await User.create({ name: 'Teacher2', email: 'teacher2@security.test', password: 'hash', role: 'teacher' });
  const studentA = await User.create({ name: 'StudentA', email: 'studenta@security.test', password: 'hash', role: 'student' });
  const studentB = await User.create({ name: 'StudentB', email: 'studentb@security.test', password: 'hash', role: 'student' });
  return { admin, teacher1, teacher2, studentA, studentB };
}

describe('Security: Password never returned', () => {
  it('GET /api/admin/users does not include password field', async () => {
    const { admin } = await setupUsers();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/admin/users');
    const res = await getAdminUsers(req as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<Record<string, unknown>> };
    for (const user of json.data) {
      expect(user.password).toBeUndefined();
    }
  });

  it('POST /api/admin/users response does not include password', async () => {
    const { admin } = await setupUsers();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/admin/users', {
      name: 'Sec Student',
      email: 'secstudent@security.test',
      password: 'securepass',
      role: 'student',
    });
    const res = await postAdminUsers(req as never);
    expect(res.status).toBe(201);
    const json = await res.json() as { data: Record<string, unknown> };
    expect(json.data.password).toBeUndefined();
  });
});

describe('Security: Progress isolation', () => {
  it("student A cannot see student B's progress records", async () => {
    const { teacher1, studentA, studentB } = await setupUsers();
    const course = await Course.create({ title: 'Sec Course', description: 'Security test', teacher: teacher1._id });
    const video = await Video.create({ course: course._id, title: 'Vid', youtubeId: 'secVidXYZ12', order: 1 });

    // Create progress for studentB
    await Progress.create({
      student: studentB._id,
      video: video._id,
      course: course._id,
      watchedSeconds: 150,
      totalSeconds: 300,
      percentComplete: 50,
    });

    // StudentA queries progress with courseId
    mockAuth.mockResolvedValueOnce({ user: { id: studentA._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', `http://localhost/api/progress?courseId=${course._id.toString()}`);
    const res = await getProgress(req as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ student: string }> };
    // Should be empty — studentA has no progress, and studentB's is not returned
    for (const p of json.data) {
      expect(p.student.toString()).toBe(studentA._id.toString());
      expect(p.student.toString()).not.toBe(studentB._id.toString());
    }
  });
});

describe('Security: Course ownership', () => {
  it("teacher B cannot PATCH teacher A's course", async () => {
    const { teacher1, teacher2 } = await setupUsers();
    const course = await Course.create({ title: 'Teacher A Course', description: 'Owned by teacher 1', teacher: teacher1._id });

    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('PATCH', `http://localhost/api/courses/${course._id.toString()}`, {
      title: 'Hacked',
      description: 'Taken over',
    });
    const res = await patchCourse(req as never, { params: Promise.resolve({ id: course._id.toString() }) });
    expect(res.status).toBe(403);
  });

  it("teacher B cannot DELETE teacher A's course", async () => {
    const { teacher1, teacher2 } = await setupUsers();
    const course = await Course.create({ title: 'Teacher A Course 2', description: 'Owned by teacher 1', teacher: teacher1._id });

    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('DELETE', `http://localhost/api/courses/${course._id.toString()}`);
    const res = await deleteCourse(req as never, { params: Promise.resolve({ id: course._id.toString() }) });
    expect(res.status).toBe(403);
  });
});

describe('Security: Meet link protection', () => {
  it('student not in batch cannot get meet link', async () => {
    const { teacher1, studentB } = await setupUsers();
    const course = await Course.create({ title: 'Live Course', description: 'Live test', teacher: teacher1._id });
    const batch = await Batch.create({ name: 'Secure Batch', teacher: teacher1._id, course: course._id, students: [] });
    const session = await LiveSession.create({
      batch: batch._id,
      teacher: teacher1._id,
      course: course._id,
      title: 'Secret Session',
      scheduledAt: new Date(Date.now() + 3600000),
      duration: 60,
      meetLink: 'https://meet.google.com/secret',
      status: 'scheduled',
    });

    mockAuth.mockResolvedValueOnce({ user: { id: studentB._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', `http://localhost/api/live/${session._id.toString()}/join`);
    const res = await getJoin(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(403);
  });

  it('ended session cannot be joined', async () => {
    const { teacher1, studentA } = await setupUsers();
    const course = await Course.create({ title: 'Ended Course', description: 'Ended test', teacher: teacher1._id });
    const batch = await Batch.create({ name: 'Ended Batch', teacher: teacher1._id, course: course._id, students: [studentA._id] });
    const session = await LiveSession.create({
      batch: batch._id,
      teacher: teacher1._id,
      course: course._id,
      title: 'Ended Session',
      scheduledAt: new Date(Date.now() - 7200000),
      duration: 60,
      meetLink: 'https://meet.google.com/ended',
      status: 'ended',
    });

    mockAuth.mockResolvedValueOnce({ user: { id: studentA._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', `http://localhost/api/live/${session._id.toString()}/join`);
    const res = await getJoin(req as never, { params: Promise.resolve({ id: session._id.toString() }) });
    expect(res.status).toBe(410);
  });
});

describe('Security: Download proxy', () => {
  it('rejects non-cloudinary URLs', async () => {
    const { admin } = await setupUsers();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const url = new URL('http://localhost/api/download');
    url.searchParams.set('url', 'https://evil.com/steal.pdf');
    const req = makeRequest('GET', url.toString());
    const res = await getDownload(req as never);
    expect(res.status).toBe(400);
  });

  it('rejects javascript: URLs', async () => {
    const { admin } = await setupUsers();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const url = new URL('http://localhost/api/download');
    url.searchParams.set('url', 'javascript:alert(document.cookie)');
    const req = makeRequest('GET', url.toString());
    const res = await getDownload(req as never);
    expect(res.status).toBe(400);
  });

  it('rejects data: URLs', async () => {
    const { admin } = await setupUsers();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const url = new URL('http://localhost/api/download');
    url.searchParams.set('url', 'data:text/html,<script>alert(1)</script>');
    const req = makeRequest('GET', url.toString());
    const res = await getDownload(req as never);
    expect(res.status).toBe(400);
  });
});

describe('Security: AI enrollment check', () => {
  it('student cannot ask AI for course they are not enrolled in', async () => {
    const { teacher1, studentB } = await setupUsers();
    const course = await Course.create({ title: 'Private Course', description: 'Not enrolled', teacher: teacher1._id });

    process.env.OPENROUTER_API_KEY = 'test-key';
    mockAuth.mockResolvedValueOnce({ user: { id: studentB._id.toString(), role: 'student' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/ai/ask', {
      question: 'What is this course about?',
      courseId: course._id.toString(),
    });
    const res = await postAi(req as never);
    expect(res.status).toBe(403);
  });
});
