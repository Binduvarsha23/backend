import mongoose from 'mongoose';

const passwordFieldSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  placeholder: { type: String },
  helperText: { type: String },
  required: { type: Boolean, default: true },
  visible: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
});

export default mongoose.model('PasswordField', passwordFieldSchema);
