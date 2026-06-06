import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPDFResource extends Document {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  title: string;
  fileUrl: string;
  extractedText: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PDFResourceSchema = new Schema<IPDFResource>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    extractedText: { type: String, default: '' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const PDFResource: Model<IPDFResource> =
  mongoose.models.PDFResource ?? mongoose.model<IPDFResource>('PDFResource', PDFResourceSchema);

export default PDFResource;
