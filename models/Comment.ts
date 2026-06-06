import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  course: mongoose.Types.ObjectId | null;
  video: mongoose.Types.ObjectId | null;
  parentComment: mongoose.Types.ObjectId | null;
  isPinned: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    video: { type: Schema.Types.ObjectId, ref: 'Video', default: null },
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Comment: Model<IComment> =
  mongoose.models.Comment ?? mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;
