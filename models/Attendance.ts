import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  session: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  markedBy: mongoose.Types.ObjectId;
  status: 'present' | 'absent' | 'late';
  markedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'LiveSession', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

AttendanceSchema.index({ session: 1, student: 1 }, { unique: true });

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ?? mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
