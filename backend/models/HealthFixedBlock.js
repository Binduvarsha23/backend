const mongoose = require('mongoose');

const HealthFixedBlockSchema = new mongoose.Schema({
  blockName: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('healthblocknames', HealthFixedBlockSchema);
