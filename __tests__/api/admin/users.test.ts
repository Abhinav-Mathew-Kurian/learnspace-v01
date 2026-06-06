import { GET, POST } from '@/app/api/admin/users/route';
import { PATCH, DELETE } from '@/app/api/admin/users/[id]/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
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
  const admin = await User.create({ name: 'Admin', email: 'admin@adminusers.api', password: 'hash', role: 'admin' });
  const teacher = await User.create({ name: 'Teacher', email: 'teacher@adminusers.api', password: 'hash', role: 'teacher' });
  const student = await User.create({ name: 'Student', email: 'student@adminusers.api', password: 'hash', role: 'student' });
  return { admin, teacher, student };
}

describe('GET /api/admin/users', () => {
  it('returns 401 for student role', async () => {
    const { student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/admin/users');
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 401 for teacher role', async () => {
    const { teacher } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/admin/users');
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it('admin GET returns users list without password', async () => {
    const { admin } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/admin/users');
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<Record<string, unknown>> };
    expect(json.data.length).toBeGreaterThan(0);
    // password field should not be in response
    for (const user of json.data) {
      expect(user.password).toBeUndefined();
    }
  });
});

describe('POST /api/admin/users', () => {
  it('admin POST creates user with hashed password, no password in response', async () => {
    const { admin } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/admin/users', {
      name: 'New Student',
      email: 'newstudent@admin.test',
      password: 'password123',
      role: 'student',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json() as { success: boolean; data: Record<string, unknown> };
    expect(json.success).toBe(true);
    expect(json.data.password).toBeUndefined();
    expect(json.data.email).toBe('newstudent@admin.test');

    // Verify password is hashed in DB
    const saved = await User.findOne({ email: 'newstudent@admin.test' }).select('+password');
    expect(saved?.password).not.toBe('password123');
    expect(saved?.password.startsWith('$2')).toBe(true); // bcrypt hash prefix
  });

  it('returns 401 for non-admin', async () => {
    const { student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/admin/users', {
      name: 'Fake',
      email: 'fake@fake.com',
      password: 'pass123',
      role: 'student',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 409 when email already in use', async () => {
    const { admin, student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/admin/users', {
      name: 'Duplicate',
      email: student.email, // already exists
      password: 'pass123',
      role: 'student',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/admin/users/[id]', () => {
  it('admin can ban a user and set banReason', async () => {
    const { admin, student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('PATCH', `http://localhost/api/admin/users/${student._id.toString()}`, {
      isBanned: true,
      banReason: 'Violated code of conduct',
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: student._id.toString() }) });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { isBanned: boolean; banReason: string } };
    expect(json.data.isBanned).toBe(true);
    expect(json.data.banReason).toBe('Violated code of conduct');
  });

  it('admin can deactivate a user by setting isActive false', async () => {
    const { admin, student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('PATCH', `http://localhost/api/admin/users/${student._id.toString()}`, {
      isActive: false,
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: student._id.toString() }) });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { isActive: boolean } };
    expect(json.data.isActive).toBe(false);
  });

  it('returns 401 for non-admin', async () => {
    const { teacher, student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('PATCH', `http://localhost/api/admin/users/${student._id.toString()}`, {
      isActive: false,
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: student._id.toString() }) });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/admin/users/[id]', () => {
  it('admin DELETE removes the user', async () => {
    const { admin, student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makeRequest('DELETE', `http://localhost/api/admin/users/${student._id.toString()}`);
    const res = await DELETE(req as never, { params: Promise.resolve({ id: student._id.toString() }) });
    expect(res.status).toBe(200);
    const deleted = await User.findById(student._id);
    expect(deleted).toBeNull();
  });

  it('returns 401 for non-admin', async () => {
    const { student, teacher } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const req = makeRequest('DELETE', `http://localhost/api/admin/users/${student._id.toString()}`);
    const res = await DELETE(req as never, { params: Promise.resolve({ id: student._id.toString() }) });
    expect(res.status).toBe(401);
  });
});
