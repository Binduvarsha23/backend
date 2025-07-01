import mongoose from 'mongoose';

const nomineeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['asset', 'investment'], required: true },
  itemId: { type: String, required: true },
  percentage: { type: Number, required: true },
  nomineeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  nomineeName: String,
  nomineeRelation: String,
  createdAt: { type: Date, default: Date.now },
  favorite: { type: Boolean, default: false },
});

export default mongoose.model('Nominee', nomineeSchema);
