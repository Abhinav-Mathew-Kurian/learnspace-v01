import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const url      = searchParams.get('url');
  const filename = searchParams.get('filename') ?? 'document';

  if (!url) {
    return NextResponse.json({ success: false, error: 'Missing url parameter' }, { status: 400 });
  }

  if (!url.startsWith('https://res.cloudinary.com/')) {
    return NextResponse.json({ success: false, error: 'Invalid URL' }, { status: 400 });
  }

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    return NextResponse.json({ success: false, error: 'Failed to fetch file' }, { status: 502 });
  }

  // Sanitise filename — strip path characters, ensure .pdf extension
  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'document';
  const contentDisposition = `attachment; filename="${safeFilename}.pdf"; filename*=UTF-8''${encodeURIComponent(safeFilename)}.pdf`;

  // Stream the Cloudinary response straight to the client — no buffering
  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
