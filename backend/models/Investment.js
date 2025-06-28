import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema({
  name: String,
  type: String,
  investedAmount: Number,
  currentValue: Number,
  nominee: String,
});

export default mongoose.model("Investment", investmentSchema);
