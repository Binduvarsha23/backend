import mongoose from 'mongoose';

const FieldConfigSchema = new mongoose.Schema({
  blockId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlockMetadata', required: true },
  fieldKey: { type: String, required: true },
  label: { type: String, required: true },
  required: { type: Boolean, default: true },
  visible: { type: Boolean, default: true },
});

FieldConfigSchema.index({ blockId: 1, fieldKey: 1 }, { unique: true });

export default mongoose.model('FieldConfig', FieldConfigSchema);
