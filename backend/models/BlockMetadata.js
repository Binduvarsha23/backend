import mongoose from 'mongoose';

const { Schema } = mongoose;

const BlockMetadataSchema = new Schema({
  name: { type: String, required: true, unique: true },
  iconUrl: { type: String, required:true },
  data_collection_name: { type: String, required:true },
});

export default mongoose.model('BlockMetadata', BlockMetadataSchema);
