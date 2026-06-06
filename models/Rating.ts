import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRating extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  rating: number;
  comment: string;
  role?: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, minlength: 10 },
    role: { type: String },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Rating: Model<IRating> =
  mongoose.models.Rating ?? mongoose.model<IRating>('Rating', RatingSchema);

export default Rating;
