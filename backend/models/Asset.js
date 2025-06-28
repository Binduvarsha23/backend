import mongoose from "mongoose";

const assetSchema = new mongoose.Schema({
  name: String,
  type: String,
  value: Number,
  location: String,
  nominee: String,
  description: String,
});

export default mongoose.model("Asset", assetSchema);
