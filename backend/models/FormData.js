import mongoose from 'mongoose';

const formDataSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // ✅ Add userId
  blockId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlockMetadata', required: true },
  blockName: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('FormData', formDataSchema);
