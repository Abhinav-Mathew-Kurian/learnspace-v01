import { GET, PATCH } from '@/app/api/admin/ratings/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Rating from '@/models/Rating';
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

async function setup() {
  const admin = await User.create({ name: 'Admin', email: 'admin@ratings.test', password: 'hash', role: 'admin' });
  const teacher = await User.create({ name: 'Teacher', email: 'teacher@ratings.test', password: 'hash', role: 'teacher' });
  return { admin, teacher };
}

describe('GET /api/admin/ratings', () => {
  it('returns 401 when unauthenticated', async () => {
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

  it('admin GET returns ALL ratings (approved and pending)', async () => {
    const { admin } = await setup();
    await Rating.create([
      { name: 'Approved User', rating: 5, comment: 'Excellent course content!', isApproved: true },
      { name: 'Pending User', rating: 3, comment: 'Good but could be better!', isApproved: false },
    ]);
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ name: string; isApproved: boolean }> };
    const names = json.data.map((r) => r.name);
    expect(names).toContain('Approved User');
    expect(names).toContain('Pending User'); // admin sees all, not just approved
  });
});

describe('PATCH /api/admin/ratings', () => {
  it('admin can approve a rating', async () => {
    const { admin } = await setup();
    const rating = await Rating.create({ name: 'Review User', rating: 4, comment: 'Very helpful content!', isApproved: false });
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/admin/ratings', { id: rating._id.toString(), isApproved: true }));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { isApproved: boolean } };
    expect(json.data.isApproved).toBe(true);
  });

  it('admin can un-approve a rating', async () => {
    const { admin } = await setup();
    const rating = await Rating.create({ name: 'Revoke User', rating: 2, comment: 'Not what I expected!', isApproved: true });
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/admin/ratings', { id: rating._id.toString(), isApproved: false }));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { isApproved: boolean } };
    expect(json.data.isApproved).toBe(false);
  });

  it('returns 400 when id is missing', async () => {
    const { admin } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/admin/ratings', { isApproved: true }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when isApproved is not a boolean', async () => {
    const { admin } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/admin/ratings', { id: 'someid', isApproved: 'yes' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 for teacher role', async () => {
    const { teacher } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/admin/ratings', { id: 'x', isApproved: true }));
    expect(res.status).toBe(401);
  });
});
