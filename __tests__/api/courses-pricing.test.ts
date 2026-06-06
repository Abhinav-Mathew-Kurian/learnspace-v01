/**
 * Tests for course pricing: admin/teacher sets price, discount, currency.
 */
import { GET, POST } from '@/app/api/courses/route';
import { PATCH } from '@/app/api/courses/[id]/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
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
  const admin   = await User.create({ name: 'Admin',   email: 'admin@pricing.test',   password: 'h', role: 'admin'   });
  const teacher = await User.create({ name: 'Teacher', email: 'teacher@pricing.test', password: 'h', role: 'teacher' });
  const course  = await Course.create({
    title: 'Priced Course', description: 'A course with price', teacher: teacher._id, isPublished: true,
  });
  return { admin, teacher, course };
}

describe('Course pricing — POST /api/courses', () => {
  it('teacher creates course with price → price stored', async () => {
    const { teacher } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/courses', {
      title: 'Paid Course',
      description: 'A course that costs money',
      price: 4999,
      originalPrice: 9999,
      currency: 'INR',
    }));
    expect(res.status).toBe(201);
    const json = await res.json() as { data: { price: number; originalPrice: number; currency: string } };
    expect(json.data.price).toBe(4999);
    expect(json.data.originalPrice).toBe(9999);
    expect(json.data.currency).toBe('INR');
  });

  it('course defaults to price=0 (free) when not specified', async () => {
    const { teacher } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/courses', {
      title: 'Free Course',
      description: 'No price — defaults to 0',
    }));
    expect(res.status).toBe(201);
    const json = await res.json() as { data: { price: number } };
    expect(json.data.price).toBe(0);
  });
});

describe('Course pricing — PATCH /api/courses/[id]', () => {
  it('admin sets price on existing course', async () => {
    const { admin, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${course._id}`, {
        price: 2999,
        originalPrice: 5999,
        currency: 'INR',
      }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { price: number; originalPrice: number } };
    expect(json.data.price).toBe(2999);
    expect(json.data.originalPrice).toBe(5999);
  });

  it('admin sets price to 0 (makes course free)', async () => {
    const { admin, course } = await setup();
    // First set a price
    await Course.findByIdAndUpdate(course._id, { price: 4999 });

    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${course._id}`, { price: 0 }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { price: number } };
    expect(json.data.price).toBe(0);
  });

  it('admin can set USD currency', async () => {
    const { admin, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${course._id}`, {
        price: 99,
        currency: 'USD',
      }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { currency: string } };
    expect(json.data.currency).toBe('USD');
  });

  it('admin clears discount by setting originalPrice to null', async () => {
    const { admin, course } = await setup();
    await Course.findByIdAndUpdate(course._id, { price: 2999, originalPrice: 5999 });

    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${course._id}`, { originalPrice: null }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { originalPrice: number | null } };
    expect(json.data.originalPrice).toBeNull();
  });

  it('rejects negative price', async () => {
    const { admin, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${course._id}`, { price: -100 }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    expect(res.status).toBe(400);
  });
});

describe('Course pricing — GET /api/courses returns price fields', () => {
  it('course list includes price, originalPrice, currency for admin', async () => {
    const { admin, course } = await setup();
    await Course.findByIdAndUpdate(course._id, { price: 1999, originalPrice: 3999, currency: 'INR' });

    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await GET(makeReq('GET', 'http://localhost/api/courses'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ title: string; price: number; originalPrice: number }> };
    const priced = json.data.find(c => c.title === 'Priced Course');
    expect(priced?.price).toBe(1999);
    expect(priced?.originalPrice).toBe(3999);
  });
});
