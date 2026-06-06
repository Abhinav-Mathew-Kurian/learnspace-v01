/**
 * Backfill script — run once after adding transcript/extractedText features.
 * Re-extracts text from PDFs that have empty extractedText.
 * Fetches YouTube transcripts for videos that have no transcript field.
 *
 * Usage: node scripts/backfill-ai-content.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const MONGODB_URI = process.env.MONGODB_URI;
const TRANSCRIPT_CAP = 20_000;
const PDF_TEXT_CAP   = 50_000;

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const { MongoClient, ObjectId } = await import('mongodb');
const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db('learnapp');
console.log('Connected to MongoDB\n');

// ─── Extract PDF text via pdf-parse v2 ────────────────────────────────────────
async function extractText(buffer) {
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text?.trim().slice(0, PDF_TEXT_CAP) ?? '';
  } catch (e) {
    return '';
  }
}

// ─── Fetch YouTube transcript ─────────────────────────────────────────────────
async function fetchTranscript(youtubeId) {
  try {
    const { YoutubeTranscript } = require('youtube-transcript');
    const segs = await YoutubeTranscript.fetchTranscript(youtubeId);
    const text = segs
      .map(s => s.text.replace(/\[.*?\]/g, '').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return text.slice(0, TRANSCRIPT_CAP);
  } catch {
    return '';
  }
}

// ─── Backfill PDFs ─────────────────────────────────────────────────────────────
console.log('━━ Backfilling PDF extractedText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const pdfs = await db.collection('pdfresources').find({
  $or: [{ extractedText: '' }, { extractedText: { $exists: false } }],
}).toArray();

console.log(`Found ${pdfs.length} PDFs with empty extractedText`);

for (const pdf of pdfs) {
  process.stdout.write(`  Fetching: ${pdf.title} (${pdf.fileUrl.slice(-20)})… `);
  try {
    const res = await fetch(pdf.fileUrl);
    if (!res.ok) { console.log(`SKIP (HTTP ${res.status})`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    // Verify magic bytes
    if (buf.slice(0, 5).toString('ascii') !== '%PDF-') {
      console.log('SKIP (not a PDF)'); continue;
    }
    const text = await extractText(buf);
    if (text) {
      await db.collection('pdfresources').updateOne(
        { _id: pdf._id },
        { $set: { extractedText: text } }
      );
      console.log(`✓ ${text.length} chars`);
    } else {
      console.log('empty (no selectable text or encrypted)');
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
}

// ─── Backfill video transcripts ────────────────────────────────────────────────
console.log('\n━━ Backfilling video transcripts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const videos = await db.collection('videos').find({
  $or: [
    { transcript: { $exists: false } },
    { transcript: '' },
    { transcript: null },
  ],
}).toArray();

console.log(`Found ${videos.length} videos without transcripts`);

for (const video of videos) {
  process.stdout.write(`  ${video.title} (${video.youtubeId})… `);
  const transcript = await fetchTranscript(video.youtubeId);
  await db.collection('videos').updateOne(
    { _id: video._id },
    {
      $set: {
        transcript,
        transcriptFetchedAt: transcript ? new Date() : null,
      }
    }
  );
  console.log(transcript ? `✓ ${transcript.length} chars` : 'no captions available');
}

await client.close();
console.log('\nBackfill complete.');
