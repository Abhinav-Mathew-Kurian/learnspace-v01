import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEnquiry extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema = new Schema<IEnquiry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Enquiry: Model<IEnquiry> =
  mongoose.models.Enquiry ?? mongoose.model<IEnquiry>('Enquiry', EnquirySchema);

export default Enquiry;
