import mongoose from 'mongoose';

const healthBlockSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  blockName: { type: String, required: true }, // e.g. "Dental"
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("HealthBlock", healthBlockSchema);
