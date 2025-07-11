import mongoose from 'mongoose';

const familyMemberSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  fullName: { type: String, required: true },
  relation: { type: String, required: true },
  pan: { type: String },
  phone: { type: String },
  nominee: { type: Boolean, default: false },
   image: { type: String , required: true},
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('FamilyMember', familyMemberSchema);
