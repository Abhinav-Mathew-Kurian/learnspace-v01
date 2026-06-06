import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PDFResource from '@/models/PDFResource';
import Video from '@/models/Video';
import Enrollment from '@/models/Enrollment';
import AiRequest from '@/models/AiRequest';
import { askOpenRouter } from '@/lib/openrouter';
import { z } from 'zod';

const RATE_LIMIT = 15;

async function checkRateLimit(userId: string): Promise<{ allowed: boolean }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await AiRequest.countDocuments({ user: userId, createdAt: { $gt: oneHourAgo } });
  if (count >= RATE_LIMIT) return { allowed: false };
  await AiRequest.create({ user: userId });
  return { allowed: true };
}

/** Score paragraphs by keyword overlap with the question, return most relevant chunks. */
function extractRelevantContext(question: string, fullText: string, maxChars: number): string {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'into', 'through', 'from', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'what', 'how', 'why', 'when', 'where', 'which']);
  const keywords = question.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
  if (!fullText?.trim()) return '';
  const paragraphs = fullText.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 30);
  if (paragraphs.length === 0) return fullText.slice(0, maxChars);
  const scored = paragraphs.map(p => {
    const lower = p.toLowerCase();
    const score = keywords.reduce((s, kw) => s + (lower.match(new RegExp(kw, 'g')) ?? []).length, 0);
    return { text: p, score };
  });
  const threshold = Math.max(1, Math.max(...scored.map(s => s.score)) * 0.3);
  const relevant = scored.map((s, i) => ({ ...s, idx: i }))
    .filter(s => s.score >= threshold || s.idx < 3)
    .sort((a, b) => b.score - a.score);
  let result = '';
  const used = new Set<number>();
  for (const { idx } of relevant) {
    if (result.length >= maxChars) break;
    const p = paragraphs[idx];
    if (!used.has(idx) && result.length + p.length <= maxChars) { result += p + '\n\n'; used.add(idx); }
  }
  return result.trim() || fullText.slice(0, maxChars);
}

const schema = z.object({
  question: z.string().min(1).max(1000),
  courseId: z.string().min(1),
  videoId: z.string().optional(),  // when watching a specific video
});

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !['student', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { question, courseId, videoId } = parsed.data;

  await connectDB();

  if (session.user.role === 'student') {
    const rl = await checkRateLimit(session.user.id);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: `You've reached the limit of ${RATE_LIMIT} questions per hour. Try again later.` },
        { status: 429 },
      );
    }
  }

  if (session.user.role === 'student') {
    const enrolled = await Enrollment.findOne({ student: session.user.id, course: courseId, isActive: true });
    if (!enrolled) return NextResponse.json({ success: false, error: 'Not enrolled' }, { status: 403 });
  }

  // When watching a specific video, fetch that video first and give it priority
  let currentVideo: { title: string; transcript: string } | null = null;
  if (videoId) {
    currentVideo = await Video.findById(videoId).select('title transcript').lean() as { title: string; transcript: string } | null;
  }

  // Fetch remaining course PDFs and other video transcripts
  const [resources, otherVideos] = await Promise.all([
    PDFResource.find({ course: courseId })
      .sort({ createdAt: -1 }).limit(3).select('extractedText title'),
    Video.find({
      course: courseId,
      isPublished: true,
      transcript: { $ne: '' },
      ...(videoId ? { _id: { $ne: videoId } } : {}),
    }).sort({ order: 1 }).limit(4).select('transcript title'),
  ]);

  let context = '';

  // Current video gets 8k chars (top priority when video-mode)
  if (currentVideo?.transcript) {
    const relevant = extractRelevantContext(question, currentVideo.transcript, 8_000);
    if (relevant) context += `\n--- Currently watching: ${currentVideo.title} ---\n${relevant}\n`;
  }

  // PDFs get 4k chars total
  const PDF_BUDGET = 4_000;
  const CONTEXT_PER_PDF = Math.floor(PDF_BUDGET / Math.max(resources.length, 1));
  for (const r of resources) {
    const relevant = extractRelevantContext(question, r.extractedText ?? '', CONTEXT_PER_PDF);
    if (relevant) context += `\n--- PDF: ${r.title} ---\n${relevant}\n`;
  }

  // Other videos fill remaining budget (4k)
  const VIDEO_BUDGET = 4_000;
  const CONTEXT_PER_VIDEO = Math.floor(VIDEO_BUDGET / Math.max(otherVideos.length, 1));
  for (const v of otherVideos) {
    const relevant = extractRelevantContext(question, v.transcript ?? '', CONTEXT_PER_VIDEO);
    if (relevant) context += `\n--- Video: ${v.title} ---\n${relevant}\n`;
  }

  const videoContext = currentVideo ? `The student is currently watching: "${currentVideo.title}".` : '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const aiStream = await askOpenRouter(question, context.trim(), videoContext);
        const reader = aiStream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
              const delta = json.choices?.[0]?.delta?.content ?? '';
              if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify(delta)}\n\n`));
            } catch { continue; }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const msg = err instanceof Error && err.name === 'AbortError'
          ? '⚠ The AI took too long to respond. Please try again.'
          : '⚠ ' + String(err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        try { controller.close(); } catch { /* already closed */ }
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
