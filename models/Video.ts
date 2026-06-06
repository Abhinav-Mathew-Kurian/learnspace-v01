import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVideo extends Document {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  title: string;
  description: string;
  youtubeId: string;
  duration: number;
  order: number;
  isPublished: boolean;
  releaseDate: Date | null;
  transcript: string;        // fetched from YouTube captions at save time
  transcriptFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    youtubeId: { type: String, required: true },
    duration: { type: Number, default: 0 },
    order: { type: Number, required: true },
    isPublished: { type: Boolean, default: true },
    releaseDate: { type: Date, default: null },
    transcript: { type: String, default: '' },
    transcriptFetchedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Video: Model<IVideo> =
  mongoose.models.Video ?? mongoose.model<IVideo>('Video', VideoSchema);

export default Video;
