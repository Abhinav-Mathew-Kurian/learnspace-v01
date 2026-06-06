import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadPDFBuffer } from '@/lib/cloudinary';
import { connectDB } from '@/lib/mongodb';
import PDFResource from '@/models/PDFResource';
import { z } from 'zod';

const schema = z.object({
  courseId: z.string(),
  title: z.string().min(2),
});

// Max pages extracted per upload. Keeps Vercel free-tier execution well under
// its 10 s serverless timeout while still giving the AI plenty of context.
const MAX_EXTRACT_PAGES = 80;

const enc = new TextEncoder();
function sseEvent(data: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

interface PageTextResult { num: number; text: string; }
interface TextResult    { pages: PageTextResult[]; text: string; total: number; }
interface PDFParseClass {
  getText(params?: { first?: number }): Promise<TextResult>;
  destroy(): Promise<void>;
}

async function extractText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse') as {
      PDFParse: new (opts: { data: Buffer | ArrayBuffer }) => PDFParseClass;
    };

    const parser = new PDFParse({ data: buffer });

    // Extract text page-by-page. `first` limits parsing to avoid timeouts on
    // large PDFs — pdfjs-dist is CPU-bound and Vercel Hobby cuts off at 10 s.
    const result = await parser.getText({ first: MAX_EXTRACT_PAGES });
    await parser.destroy();

    const totalPages = result.total;
    const parts: string[] = [];

    for (const page of result.pages) {
      const text = page.text.trim();
      // Pages with no extracted text are almost certainly image-only (scanned
      // pages, full-page diagrams, etc.). Leave a marker so the AI knows
      // content exists there even though it cannot read it.
      if (text.length > 0) {
        parts.push(`--- Page ${page.num} ---\n${text}`);
      } else {
        parts.push(`--- Page ${page.num} ---\n[This page contains images or diagrams — no selectable text]`);
      }
    }

    if (totalPages > MAX_EXTRACT_PAGES) {
      parts.push(
        `[Note: This PDF has ${totalPages} pages. ` +
        `Text was extracted from pages 1–${MAX_EXTRACT_PAGES} only. ` +
        `Pages ${MAX_EXTRACT_PAGES + 1}–${totalPages} were not processed.]`
      );
    }

    // 200 000-char ceiling as a hard safety net (well within MongoDB's 16 MB limit).
    return parts.join('\n\n').slice(0, 200_000);
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file     = formData.get('file')     as File   | null;
  const courseId = formData.get('courseId') as string | null;
  const title    = formData.get('title')    as string | null;

  const parsed = schema.safeParse({ courseId, title });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ success: false, error: 'PDF file required' }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ success: false, error: 'PDF too large (max 20MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.slice(0, 5).toString('ascii') !== '%PDF-') {
    return NextResponse.json({ success: false, error: 'File is not a valid PDF' }, { status: 400 });
  }

  // Stream SSE progress events so the client can show a live progress bar.
  // The XHR upload (client→server) covers 0-40%; these server events cover 40-100%.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sseEvent(data));

      try {
        send({ percent: 45, message: 'Extracting text & uploading…' });

        // Run text extraction and Cloudinary upload in parallel, but emit
        // individual completion events so the bar moves as each finishes.
        let textDone = false;
        let cdnDone  = false;

        const [extractedText, fileUrl] = await Promise.all([
          extractText(buffer).then((t) => {
            textDone = true;
            send({ percent: cdnDone ? 80 : 62, message: 'Text extracted' });
            return t;
          }),
          uploadPDFBuffer(buffer).then((u) => {
            cdnDone = true;
            send({ percent: textDone ? 80 : 72, message: 'Uploaded to CDN' });
            return u;
          }),
        ]);

        send({ percent: 88, message: 'Saving to library…' });
        await connectDB();
        const resource = await PDFResource.create({
          course: parsed.data.courseId,
          title: parsed.data.title,
          fileUrl,
          extractedText,
          uploadedBy: session.user.id,
        });

        send({ percent: 100, stage: 'done', message: 'Upload complete!', data: resource.toObject() });
      } catch (err) {
        send({ stage: 'error', message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
