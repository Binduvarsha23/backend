// src/models/Asset.js
import mongoose from "mongoose";

const assetSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: String,
  type: String,
  value: Number,
  location: String,
  description: String,
  imageUrl: String,
  favorite: { type: Boolean, default: false },
});

export default mongoose.model("Asset", assetSchema);
