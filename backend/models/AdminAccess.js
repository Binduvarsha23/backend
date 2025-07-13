import mongoose from 'mongoose';
const AdminAccessSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['readonly', 'readwrite'], required: true },
});
export default mongoose.model('AdminAccess', AdminAccessSchema);
