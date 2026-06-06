import { GET, POST } from '@/app/api/admin/webinars/route';
import { PATCH, DELETE } from '@/app/api/admin/webinars/[id]/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import PublicWebinar from '@/models/PublicWebinar';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

function makeReq(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const validWebinar = {
  title: 'Intro to React',
  description: 'A free webinar on React basics',
  date: new Date(Date.now() + 86400000).toISOString(),
  duration: 60,
  meetingUrl: 'https://meet.google.com/test',
  instructor: 'Jane Doe',
  topic: 'React Fundamentals',
};

async function setup() {
  const admin = await User.create({ name: 'Admin', email: 'admin@webinars.test', password: 'hash', role: 'admin' });
  const teacher = await User.create({ name: 'Teacher', email: 'teacher@webinars.test', password: 'hash', role: 'teacher' });
  return { admin, teacher };
}

describe('GET /api/admin/webinars', () => {
  it('returns 401 for unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 401 for teacher role', async () => {
    const { teacher } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('admin GET returns all webinars', async () => {
    const { admin } = await setup();
    await PublicWebinar.create({ ...validWebinar, title: 'Webinar Alpha' });
    await PublicWebinar.create({ ...validWebinar, title: 'Webinar Beta' });

    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ title: string }> };
    const titles = json.data.map((w) => w.title);
    expect(titles).toContain('Webinar Alpha');
    expect(titles).toContain('Webinar Beta');
  });
});

describe('POST /api/admin/webinars', () => {
  it('returns 401 for unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeReq('POST', 'http://localhost/api/admin/webinars', validWebinar));
    expect(res.status).toBe(401);
  });

  it('admin POST creates a webinar with date converted to Date', async () => {
    const { admin } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/admin/webinars', validWebinar));
    expect(res.status).toBe(201);
    const json = await res.json() as { success: boolean; data: { title: string } };
    expect(json.success).toBe(true);
    expect(json.data.title).toBe(validWebinar.title);
  });

  it('returns 400 when required field is missing', async () => {
    const { admin } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const { instructor: _i, ...incomplete } = validWebinar;
    const res = await POST(makeReq('POST', 'http://localhost/api/admin/webinars', incomplete));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/admin/webinars/[id]', () => {
  it('admin PATCH updates webinar', async () => {
    const { admin } = await setup();
    const webinar = await PublicWebinar.create(validWebinar);
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/admin/webinars/${webinar._id}`, { title: 'Updated Title' }),
      { params: Promise.resolve({ id: webinar._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { title: string } };
    expect(json.data.title).toBe('Updated Title');
  });

  it('returns 404 for non-existent webinar', async () => {
    const { admin } = await setup();
    const fakeId = '000000000000000000000001';
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/admin/webinars/${fakeId}`, { title: 'X' }),
      { params: Promise.resolve({ id: fakeId }) },
    );
    expect(res.status).toBe(404);
  });

  it('returns 401 for non-admin', async () => {
    const { teacher } = await setup();
    const webinar = await PublicWebinar.create(validWebinar);
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/admin/webinars/${webinar._id}`, { title: 'Hack' }),
      { params: Promise.resolve({ id: webinar._id.toString() }) },
    );
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/admin/webinars/[id]', () => {
  it('admin DELETE removes webinar', async () => {
    const { admin } = await setup();
    const webinar = await PublicWebinar.create(validWebinar);
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await DELETE(
      makeReq('DELETE', `http://localhost/api/admin/webinars/${webinar._id}`),
      { params: Promise.resolve({ id: webinar._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const deleted = await PublicWebinar.findById(webinar._id);
    expect(deleted).toBeNull();
  });

  it('returns 404 for non-existent webinar', async () => {
    const { admin } = await setup();
    const fakeId = '000000000000000000000002';
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await DELETE(
      makeReq('DELETE', `http://localhost/api/admin/webinars/${fakeId}`),
      { params: Promise.resolve({ id: fakeId }) },
    );
    expect(res.status).toBe(404);
  });
});
