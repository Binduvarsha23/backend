// src/models/Asset.js
import mongoose from "mongoose";

const assetSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Added userId field
  name: String,
  type: String,
  value: Number,
  location: String,
  nominee: String,
  description: String,
});

export default mongoose.model("Asset", assetSchema);
