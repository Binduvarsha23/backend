import express from 'express';
import mongoose from 'mongoose';
import BlockMetadata from '../models/BlockMetadata.js';

const router = express.Router();

// GET /api/block-fields/:blockId
router.get('/:blockId', async (req, res) => {
  const { blockId } = req.params;

  try {
    const block = await BlockMetadata.findById(blockId);
    if (!block || !block.data_collection_name) {
      return res.status(404).json({ error: "Block or data_collection_name not found" });
    }

    const collectionName = block.data_collection_name;
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);

    // Assuming there's one document with all the fields
    const doc = await collection.findOne();
    if (!doc) {
      return res.status(404).json({ error: "No field document found in this collection" });
    }

    // Optionally exclude _id
    const { _id, ...fields } = doc;

    res.json(fields); // 👈 Sends to frontend
  } catch (err) {
    console.error("❌ Error fetching block fields:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
