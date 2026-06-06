import { GET } from '@/app/api/download/route';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Mock global fetch for Cloudinary requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/download');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

describe('GET /api/download', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = makeRequest({ url: 'https://res.cloudinary.com/test/image.pdf' });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 when url param is missing', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'uid', role: 'student' } } as never);
    const req = makeRequest({});
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-cloudinary URL', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'uid', role: 'student' } } as never);
    const req = makeRequest({ url: 'https://malicious.com/evil.pdf' });
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 for javascript: URL', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'uid', role: 'student' } } as never);
    const req = makeRequest({ url: 'javascript:alert(1)' });
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 for data: URL', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'uid', role: 'student' } } as never);
    const req = makeRequest({ url: 'data:text/html,<h1>xss</h1>' });
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('fetches and returns PDF from valid cloudinary URL', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'uid', role: 'student' } } as never);
    const fakeBody = new ReadableStream({
      start(c) { c.enqueue(new Uint8Array([37, 80, 68, 70])); c.close(); },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: fakeBody } as never);

    const req = makeRequest({
      url: 'https://res.cloudinary.com/mycloud/raw/upload/v123/test.pdf',
      filename: 'TestDocument',
    });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
  });

  it('includes filename in Content-Disposition header', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'uid', role: 'student' } } as never);
    const fakeBody = new ReadableStream({
      start(c) { c.enqueue(new Uint8Array([37, 80, 68, 70])); c.close(); },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: fakeBody } as never);

    const req = makeRequest({
      url: 'https://res.cloudinary.com/mycloud/raw/upload/v123/file.pdf',
      filename: 'MySpecialDocument',
    });
    const res = await GET(req as never);
    expect(res.headers.get('Content-Disposition')).toContain('MySpecialDocument');
  });

  it('returns 502 when cloudinary fetch fails', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'uid', role: 'student' } } as never);
    mockFetch.mockResolvedValueOnce({ ok: false, body: null } as never);

    const req = makeRequest({ url: 'https://res.cloudinary.com/mycloud/raw/upload/fail.pdf' });
    const res = await GET(req as never);
    expect(res.status).toBe(502);
  });
});
