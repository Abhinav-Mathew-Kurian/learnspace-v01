import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'offline_class' | 'webinar' | 'live_session' | 'video_release';
  date: Date;
  endDate: Date | null;
  audience: 'all' | 'teachers' | 'students' | 'batch';
  batchId: mongoose.Types.ObjectId | null;
  guestLecturer: mongoose.Types.ObjectId | null;
  location: string | null;
  meetLink: string | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['offline_class', 'webinar', 'live_session', 'video_release'],
      required: true,
    },
    date: { type: Date, required: true },
    endDate: { type: Date, default: null },
    audience: { type: String, enum: ['all', 'teachers', 'students', 'batch'], default: 'all' },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null },
    guestLecturer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    location: { type: String, default: null },
    meetLink: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Event: Model<IEvent> =
  mongoose.models.Event ?? mongoose.model<IEvent>('Event', EventSchema);

export default Event;
