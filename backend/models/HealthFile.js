// Example of how your HealthFile model might look (ensure it has 'favorite')
import mongoose from 'mongoose';

const healthFileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  blockName: { type: String, required: true },
  fileName: { type: String, required: true },
  fileData: { type: String, required: true }, // Assuming fileData is stored as a string (e.g., base64 or URL)
  favorite: { type: Boolean, default: false }, // <--- Add this line
  createdAt: { type: Date, default: Date.now },
});

const HealthFile = mongoose.model('HealthFile', healthFileSchema);

export default HealthFile;
