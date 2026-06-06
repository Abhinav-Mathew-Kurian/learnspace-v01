import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILiveSession extends Document {
  _id: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  title: string;
  scheduledAt: Date;
  duration: number;
  meetLink: string;
  meetPassword: string | null;
  status: 'scheduled' | 'live' | 'ended';
  recordingUrl: string | null;
  createdAt: Date;
}

const LiveSessionSchema = new Schema<ILiveSession>(
  {
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, required: true },
    meetLink: { type: String, required: true },
    meetPassword: { type: String, default: null },
    status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
    recordingUrl: { type: String, default: null },
  },
  { timestamps: true }
);

const LiveSession: Model<ILiveSession> =
  mongoose.models.LiveSession ?? mongoose.model<ILiveSession>('LiveSession', LiveSessionSchema);

export default LiveSession;
