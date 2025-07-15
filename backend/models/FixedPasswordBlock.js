// models/FixedPasswordBlock.js
import mongoose from 'mongoose';

const fixedPasswordBlockSchema = new mongoose.Schema({
  blockName: { type: String, required: true },
  icon: { type: String, required: true },
  summary: { type: String }
}, { collection: 'passwordpage' }); // Match your existing collection

export default mongoose.model('FixedPasswordBlock', fixedPasswordBlockSchema);
