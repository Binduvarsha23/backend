// models/HealthFile.js
import mongoose from 'mongoose';

const healthFileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  blockName: { type: String, required: true }, // e.g., "Lab Reports", "Custom - Dental"
  fileName: { type: String, required: true },
  fileData: { type: String, required: true }, // base64 string
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('HealthFile', healthFileSchema);
