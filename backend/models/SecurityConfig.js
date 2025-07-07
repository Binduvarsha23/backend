import mongoose from 'mongoose';

const securityConfigSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },

  // 🔐 Password login
  passwordHash: {
    type: String,
    default: null
  },
  passwordEnabled: {
    type: Boolean,
    default: false
  },

  // 🔢 PIN login
  pinHash: {
    type: String,
    default: null
  },
  pinEnabled: {
    type: Boolean,
    default: false
  },

  // Optional: track when it was last updated
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastVerifiedAt: {
  type: Date,
  default: null,
}

});

export default mongoose.model('SecurityConfig', securityConfigSchema);
