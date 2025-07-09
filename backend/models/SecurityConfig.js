import mongoose from 'mongoose';

const securityConfigSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },

  // 🔐 Password login
  passwordHash: { type: String, default: null },
  passwordEnabled: { type: Boolean, default: false },

  // 🔢 PIN login
  pinHash: { type: String, default: null },
  pinEnabled: { type: Boolean, default: false },

  // ✏️ Pattern login
  patternHash: { type: String, default: null },
  patternEnabled: { type: Boolean, default: false },

  // 🧜 Biometric login
  biometricHash: { type: String, default: null }, // Used to compare against frontend signature
  biometricEnabled: { type: Boolean, default: false },
  biometricCredentials: [
    {
      credentialID: { type: String, required: true },
      publicKey: { type: String, required: true },
      counter: { type: Number, default: 0 },
      transports: [{ type: String }]
    }
  ],
  currentChallenge: { type: String, default: null },

  updatedAt: { type: Date, default: Date.now },
  lastVerifiedAt: { type: Date, default: null },

  securityQuestions: [
    {
      question: { type: String },
      answerHash: { type: String },
    }
  ],
  securityQuestionsLastUpdatedAt: { type: Date, default: null },

  passwordResetToken: { type: String, default: null },
  passwordResetTokenExpiry: { type: Date, default: null }
});

export default mongoose.model('SecurityConfig', securityConfigSchema);
