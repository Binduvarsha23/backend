// models/ad.model.js
import mongoose from 'mongoose';

const adSchema = new mongoose.Schema({
  type: { type: String, enum: ['banner', 'popup', 'card', 'story'], required: true },
  dimensions: [{ type: String, enum: ['16:9', '4:5', '1:4'], required: true }],
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  contentType: { type: String, enum: ['image', 'video', 'audio'], required: true },
  contentUrl: { type: String, required: true },
  priority: { type: Number, default: 1 },
  platform: { type: String, enum: ['web', 'mobile', 'both'], default: 'both' },
  redirectUrl: { type: String },
  ctaText: { type: String },
  sequence: { type: Number },
  header: { type: String },
  summary: { type: String },
  userOptions: [
    {
      label: String,
      value: String
    }
  ],
  isHidden: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  adminCreatedBy: { type: String }
}, { timestamps: true });

const Ad = mongoose.model('Ad', adSchema);
export default Ad;
