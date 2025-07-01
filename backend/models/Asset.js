// src/models/Asset.js
import mongoose from "mongoose";

const assetSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: String,
  type: String,
  value: Number,
  location: String,
  nominee: String,
  description: String,
  imageUrl: String, // <--- NEW FIELD: Add this line for image URL
});

export default mongoose.model("Asset", assetSchema);
