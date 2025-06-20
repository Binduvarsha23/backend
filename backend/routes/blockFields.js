import express from 'express';
import mongoose from 'mongoose';
import BlockMetadata from '../models/BlockMetadata.js';
import FieldConfig from '../models/FieldConfig.js';

const router = express.Router();

// GET /api/block-fields/:blockId
router.get('/:blockId', async (req, res) => {
  const { blockId } = req.params;

  try {
    const block = await BlockMetadata.findById(blockId);
    if (!block || !block.data_collection_name) {
      return res.status(404).json({ error: "Block or data_collection_name not found" });
    }

    const db = mongoose.connection.db;
    const collection = db.collection(block.data_collection_name);
    const doc = await collection.findOne();
    if (!doc) {
      return res.status(404).json({ error: "No field document found in this collection" });
    }

    delete doc._id;

    const overrides = await FieldConfig.find({ blockId });

    const merged = {};
    for (const key in doc) {
      const base = doc[key];
      const config = overrides.find(o => o.fieldKey === key);
      merged[key] = {
        label: config?.label ?? base.label ?? key,
        required: config?.required !== undefined ? config.required : base.required ?? true,
        visible: config?.visible !== undefined ? config.visible : true,
      };
    }

    res.json(merged);
  } catch (err) {
    console.error("❌ Error fetching block fields:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
