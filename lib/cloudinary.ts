import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/** Inject f_auto,q_auto into a Cloudinary URL so browsers get WebP/AVIF automatically. */
export function cdnUrl(url: string): string {
  if (!url?.includes('res.cloudinary.com')) return url;
  // Only inject once — idempotent
  if (url.includes('/f_auto')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}

export async function uploadImage(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const b64 = `data:${file.type};base64,${buffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(b64, {
    folder: 'learnspace/banners',
    resource_type: 'image',
    transformation: [{ width: 1280, height: 720, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
  });
  // Store URL with f_auto so every delivery path (img src, Next/Image) is already optimised
  return cdnUrl(result.secure_url);
}

export async function uploadPDF(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadPDFBuffer(buffer);
}

/** Upload a PDF from an already-read Buffer using upload_stream (no base64 overhead). */
export function uploadPDFBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'learnspace/pdfs', resource_type: 'raw' },
      (error, result) => {
        if (error || !result) reject(error ?? new Error('Cloudinary upload failed'));
        else resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export async function deleteByUrl(url: string): Promise<void> {
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  const publicId = `${folder}/${fileName.split('.')[0]}`;
  await cloudinary.uploader.destroy(publicId);
}
