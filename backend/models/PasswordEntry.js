import mongoose from 'mongoose';

const passwordEntrySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  blockName: { type: String, required: true }, // category
  data: { type: String, required: true }, // AES Encrypted string
  createdAt: { type: Date, default: Date.now },
  favorite: { type: Boolean, default: false },
});

export default mongoose.model('PasswordEntry', passwordEntrySchema);
