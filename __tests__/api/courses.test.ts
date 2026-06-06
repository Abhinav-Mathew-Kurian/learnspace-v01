import { GET, POST } from '@/app/api/courses/route';
import { PATCH, DELETE } from '@/app/api/courses/[id]/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
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

async function setup() {
  const admin = await User.create({ name: 'Admin', email: 'admin@courses.api', password: 'hash', role: 'admin' });
  const teacher1 = await User.create({ name: 'Teacher1', email: 'teacher1@courses.api', password: 'hash', role: 'teacher' });
  const teacher2 = await User.create({ name: 'Teacher2', email: 'teacher2@courses.api', password: 'hash', role: 'teacher' });
  const student = await User.create({ name: 'Student', email: 'student@courses.api', password: 'hash', role: 'student' });

  const course1 = await Course.create({ title: 'Teacher1 Course', description: 'First teacher course', teacher: teacher1._id });
  const course2 = await Course.create({ title: 'Teacher2 Course', description: 'Second teacher course', teacher: teacher2._id });
  const publishedCourse = await Course.create({ title: 'Published Course', description: 'A published course', teacher: teacher1._id, isPublished: true });

  return { admin, teacher1, teacher2, student, course1, course2, publishedCourse };
}

describe('GET /api/courses', () => {
  it('teacher GET only returns their own courses', async () => {
    const { teacher1, course1, course2 } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/courses');
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ title: string }> };
    const titles = json.data.map((c) => c.title);
    expect(titles).toContain('Teacher1 Course');
    expect(titles).not.toContain('Teacher2 Course');
  });

  it('admin GET returns all courses', async () => {
    const { admin } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/courses');
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ title: string }> };
    const titles = json.data.map((c) => c.title);
    expect(titles).toContain('Teacher1 Course');
    expect(titles).toContain('Teacher2 Course');
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = makeRequest('GET', 'http://localhost/api/courses');
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/courses', () => {
  it('teacher POST creates course with their own ID as teacher', async () => {
    const { teacher1 } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/courses', {
      title: 'New Teacher Course',
      description: 'A course created by teacher',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json() as { data: { teacher: string; title: string } };
    expect(json.data.teacher.toString()).toBe(teacher1._id.toString());
    expect(json.data.title).toBe('New Teacher Course');
  });

  it('student POST returns 401', async () => {
    const { student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/courses', {
      title: 'Student Course',
      description: 'Student trying to create a course',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/courses/[id]', () => {
  it('teacher PATCH own course returns 200', async () => {
    const { teacher1, course1 } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('PATCH', `http://localhost/api/courses/${course1._id.toString()}`, {
      title: 'Updated Title',
      description: 'Updated description here',
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: course1._id.toString() }) });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { title: string } };
    expect(json.data.title).toBe('Updated Title');
  });

  it("teacher PATCH another teacher's course returns 403", async () => {
    const { teacher2, course1 } = await setup();
    // course1 belongs to teacher1, but we authenticate as teacher2
    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('PATCH', `http://localhost/api/courses/${course1._id.toString()}`, {
      title: 'Stolen Title',
      description: 'Trying to steal the course',
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: course1._id.toString() }) });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/courses/[id]', () => {
  it("teacher DELETE another teacher's course returns 403", async () => {
    const { teacher2, course1 } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('DELETE', `http://localhost/api/courses/${course1._id.toString()}`);
    const res = await DELETE(req as never, { params: Promise.resolve({ id: course1._id.toString() }) });
    expect(res.status).toBe(403);
  });

  it('teacher DELETE own course succeeds', async () => {
    const { teacher1, course1 } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('DELETE', `http://localhost/api/courses/${course1._id.toString()}`);
    const res = await DELETE(req as never, { params: Promise.resolve({ id: course1._id.toString() }) });
    expect(res.status).toBe(200);
  });
});
