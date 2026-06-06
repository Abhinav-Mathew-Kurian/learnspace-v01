import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  avatar: string;
  phone: string;
  isActive: boolean;
  isBanned: boolean;
  banReason: string;
  subscriptionExpiry: Date | null;
  subscriptionType: '1month' | '3month' | '6month' | '1year' | null;
  installmentPending: boolean;
  installmentAmount: number | null;
  installmentDueDate: Date | null;
  installmentCourseId: mongoose.Types.ObjectId | null;
  bio: string;
  specialization: string;
  isGuestLecturer: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    subscriptionExpiry: { type: Date, default: null },
    subscriptionType: {
      type: String,
      enum: ['1month', '3month', '6month', '1year', null],
      default: null,
    },
    installmentPending: { type: Boolean, default: false },
    installmentAmount: { type: Number, default: null },
    installmentDueDate: { type: Date, default: null },
    installmentCourseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    bio: { type: String, default: '' },
    specialization: { type: String, default: '' },
    isGuestLecturer: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);

export default User;
