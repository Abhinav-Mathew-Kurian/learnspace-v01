import { GET, POST } from '@/app/api/admin/promotions/route';
import { PATCH, DELETE } from '@/app/api/admin/promotions/[id]/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Promotion from '@/models/Promotion';
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

const validPromotion = {
  title: '50% Off This Week',
  description: 'Limited time offer on all courses',
  isActive: true,
};

async function setup() {
  const admin = await User.create({ name: 'Admin', email: 'admin@promos.test', password: 'hash', role: 'admin' });
  const teacher = await User.create({ name: 'Teacher', email: 'teacher@promos.test', password: 'hash', role: 'teacher' });
  return { admin, teacher };
}

describe('GET /api/admin/promotions', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('admin GET returns all promotions (active and inactive)', async () => {
    const { admin } = await setup();
    await Promotion.create([
      { ...validPromotion, title: 'Promo Active', isActive: true },
      { ...validPromotion, title: 'Promo Inactive', isActive: false },
    ]);
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ title: string }> };
    const titles = json.data.map((p) => p.title);
    expect(titles).toContain('Promo Active');
    expect(titles).toContain('Promo Inactive');
  });
});

describe('POST /api/admin/promotions', () => {
  it('admin POST creates a promotion', async () => {
    const { admin } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/admin/promotions', validPromotion));
    expect(res.status).toBe(201);
    const json = await res.json() as { success: boolean; data: { title: string } };
    expect(json.success).toBe(true);
    expect(json.data.title).toBe(validPromotion.title);
  });

  it('returns 400 when title is missing', async () => {
    const { admin } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/admin/promotions', { description: 'No title' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 for teacher role', async () => {
    const { teacher } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/admin/promotions', validPromotion));
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/admin/promotions/[id]', () => {
  it('admin PATCH toggles isActive', async () => {
    const { admin } = await setup();
    const promo = await Promotion.create({ ...validPromotion, isActive: true });
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/admin/promotions/${promo._id}`, { isActive: false }),
      { params: Promise.resolve({ id: promo._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { isActive: boolean } };
    expect(json.data.isActive).toBe(false);
  });

  it('returns 404 for non-existent promotion', async () => {
    const { admin } = await setup();
    const fakeId = '000000000000000000000003';
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/admin/promotions/${fakeId}`, { title: 'X' }),
      { params: Promise.resolve({ id: fakeId }) },
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/promotions/[id]', () => {
  it('admin DELETE removes the promotion', async () => {
    const { admin } = await setup();
    const promo = await Promotion.create(validPromotion);
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await DELETE(
      makeReq('DELETE', `http://localhost/api/admin/promotions/${promo._id}`),
      { params: Promise.resolve({ id: promo._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const deleted = await Promotion.findById(promo._id);
    expect(deleted).toBeNull();
  });

  it('returns 401 for non-admin', async () => {
    const { teacher } = await setup();
    const promo = await Promotion.create(validPromotion);
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const res = await DELETE(
      makeReq('DELETE', `http://localhost/api/admin/promotions/${promo._id}`),
      { params: Promise.resolve({ id: promo._id.toString() }) },
    );
    expect(res.status).toBe(401);
  });
});
