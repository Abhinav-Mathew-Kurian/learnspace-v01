import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPublicWebinar extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  duration: number;
  meetingUrl: string;
  thumbnail?: string;
  instructor: string;
  topic: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PublicWebinarSchema = new Schema<IPublicWebinar>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    duration: { type: Number, required: true },
    meetingUrl: { type: String, required: true },
    thumbnail: { type: String },
    instructor: { type: String, required: true },
    topic: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PublicWebinar: Model<IPublicWebinar> =
  mongoose.models.PublicWebinar ?? mongoose.model<IPublicWebinar>('PublicWebinar', PublicWebinarSchema);

export default PublicWebinar;
