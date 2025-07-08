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
  patternHash: { type: String, default: null },
  patternEnabled: { type: Boolean, default: false },
  biometricEnabled: { type: Boolean, default: false },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastVerifiedAt: {
    type: Date,
    default: null,
  },
  securityQuestions: [
    {
      question: { type: String },
      answerHash: { type: String },
    }
  ],
  securityQuestionsLastUpdatedAt: {
    type: Date,
    default: null,
  },
  // New fields for password reset via email
  passwordResetToken: {
    type: String,
    default: null,
  },
  passwordResetTokenExpiry: {
    type: Date,
    default: null,
  },
});

export default mongoose.model('SecurityConfig', securityConfigSchema);
