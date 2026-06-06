import mongoose, { Schema, Model } from 'mongoose';

interface IAiRequest {
  user: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AiRequestSchema = new Schema<IAiRequest>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // TTL: auto-delete after 1 hour
});

const AiRequest: Model<IAiRequest> =
  mongoose.models.AiRequest ?? mongoose.model<IAiRequest>('AiRequest', AiRequestSchema);

export default AiRequest;
