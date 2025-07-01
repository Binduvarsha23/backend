// src/models/Investment.js
import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema({
  userId: { type: String, required: true }, 
  name: String,
  type: String,
  investedAmount: Number,
  currentValue: Number,
  nominee: String,
  favorite: { type: Boolean, default: false },
});

export default mongoose.model("Investment", investmentSchema);
