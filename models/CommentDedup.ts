import mongoose, { Schema, Model } from 'mongoose';

interface ICommentDedup {
  key: string;
  createdAt: Date;
}

const CommentDedupSchema = new Schema<ICommentDedup>({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 30 }, // auto-purge after 30 seconds
});

const CommentDedup: Model<ICommentDedup> =
  mongoose.models.CommentDedup ?? mongoose.model<ICommentDedup>('CommentDedup', CommentDedupSchema);

export default CommentDedup;
