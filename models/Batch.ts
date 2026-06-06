import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBatch extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  teacher: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  schedule: string;
  isActive: boolean;
  createdAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    name: { type: String, required: true, trim: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    schedule: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Batch: Model<IBatch> =
  mongoose.models.Batch ?? mongoose.model<IBatch>('Batch', BatchSchema);

export default Batch;
