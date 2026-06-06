import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPromotion extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  badge?: string;
  bgColor?: string;
  validUntil?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    linkUrl: { type: String },
    badge: { type: String },
    bgColor: { type: String },
    validUntil: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Promotion: Model<IPromotion> =
  mongoose.models.Promotion ?? mongoose.model<IPromotion>('Promotion', PromotionSchema);

export default Promotion;
