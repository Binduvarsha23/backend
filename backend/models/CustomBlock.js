import mongoose from "mongoose";

const customBlockSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  blockName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("CustomBlock", customBlockSchema);
