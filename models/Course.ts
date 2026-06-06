import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICourse extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  bannerImage: string;
  teacher: mongoose.Types.ObjectId;
  category: string;
  totalVideos: number;
  isPublished: boolean;
  previewVideoId: string | null;
  batches: mongoose.Types.ObjectId[];
  // Pricing
  pricingType: 'free' | 'lifetime' | 'installment';
  price: number;
  originalPrice: number | null;
  installmentMonths: number | null;
  currency: string;
  accessDurationMonths: number | null; // null = lifetime
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    bannerImage: { type: String, default: '' },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, default: '' },
    totalVideos: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    previewVideoId: { type: String, default: null },
    batches: [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
    pricingType: { type: String, enum: ['free', 'lifetime', 'installment'], default: 'free' },
    price: { type: Number, default: 0 },
    originalPrice: { type: Number, default: null },
    installmentMonths: { type: Number, default: null },
    currency: { type: String, default: 'INR' },
    accessDurationMonths: { type: Number, default: null },
  },
  { timestamps: true }
);

const Course: Model<ICourse> =
  mongoose.models.Course ?? mongoose.model<ICourse>('Course', CourseSchema);

export default Course;
