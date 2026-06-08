import mongoose from 'mongoose';

// Side-effect imports — ensure every Mongoose model is registered before any
// route calls populate(). In serverless environments each function bundle is
// isolated, so populate() fails with MissingSchemaError if the referenced
// model was never imported in that bundle. Importing here guarantees they're
// always registered whenever connectDB() is called.
import '@/models/User';
import '@/models/Course';
import '@/models/Video';
import '@/models/Batch';
import '@/models/Enrollment';
import '@/models/CourseInstallment';
import '@/models/LiveSession';
import '@/models/Attendance';
import '@/models/Comment';
import '@/models/CommentDedup';
import '@/models/Event';
import '@/models/PDFResource';
import '@/models/AiRequest';
import '@/models/Rating';
import '@/models/Promotion';
import '@/models/PublicWebinar';
import '@/models/Enquiry';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) throw new Error('MONGODB_URI not set in environment');

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };
global.mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,      // cap connections per serverless instance
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
