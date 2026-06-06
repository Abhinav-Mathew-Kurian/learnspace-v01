import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProgress extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  video: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  watchedSeconds: number;
  totalSeconds: number;
  percentComplete: number;
  isCompleted: boolean;
  lastWatchedAt: Date;
  lastPosition: number;
  updatedAt: Date;
}

const ProgressSchema = new Schema<IProgress>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    video: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    watchedSeconds: { type: Number, default: 0 },
    totalSeconds: { type: Number, default: 0 },
    percentComplete: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
    lastPosition: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProgressSchema.index({ student: 1, video: 1 }, { unique: true });

const Progress: Model<IProgress> =
  mongoose.models.Progress ?? mongoose.model<IProgress>('Progress', ProgressSchema);

export default Progress;
