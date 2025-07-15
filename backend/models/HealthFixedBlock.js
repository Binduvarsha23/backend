import mongoose from 'mongoose';

const HealthFixedBlockSchema = new mongoose.Schema({
  blockName: { type: String, required: true, unique: true }
});

const HealthFixedBlock = mongoose.model('healthblocknames', HealthFixedBlockSchema);
export default HealthFixedBlock;
