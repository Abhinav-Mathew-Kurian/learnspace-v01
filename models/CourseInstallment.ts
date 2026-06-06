import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICourseInstallment extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  installmentNumber: number;
  amount: number;
  currency: string;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  paidAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const CourseInstallmentSchema = new Schema<ICourseInstallment>(
  {
    student:           { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    course:            { type: Schema.Types.ObjectId, ref: 'Course',  required: true },
    installmentNumber: { type: Number, required: true },
    amount:            { type: Number, required: true },
    currency:          { type: String, default: 'INR' },
    dueDate:           { type: Date,   required: true },
    status:            { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
    paidAt:            { type: Date,   default: null },
    notes:             { type: String, default: '' },
  },
  { timestamps: true }
);

CourseInstallmentSchema.index({ student: 1, course: 1, installmentNumber: 1 }, { unique: true });

const CourseInstallment: Model<ICourseInstallment> =
  mongoose.models.CourseInstallment ??
  mongoose.model<ICourseInstallment>('CourseInstallment', CourseInstallmentSchema);

export default CourseInstallment;
