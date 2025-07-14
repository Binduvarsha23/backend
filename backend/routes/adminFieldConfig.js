import express from 'express';
import mongoose from 'mongoose';
import BlockMetadata from '../models/BlockMetadata.js';
import FieldConfig from '../models/FieldConfig.js';
import { checkAccessLevel, requireReadWrite } from './adminMiddleware.js';

const router = express.Router();

// ✅ GET all blocks with their field definitions and current config (view access for all valid roles)
router.get('/all-blocks-fields', checkAccessLevel, async (req, res) => {
  try {
    const blocks = await BlockMetadata.find();
    const db = mongoose.connection.db;
    const allBlockData = [];

    for (const block of blocks) {
      const collection = db.collection(block.data_collection_name);
      const fieldDoc = await collection.findOne() || {};
      delete fieldDoc._id;

      const fieldConfigs = await FieldConfig.find({ blockId: block._id });

      const mergedFields = Object.entries(fieldDoc).map(([key, val]) => {
        const config = fieldConfigs.find(c => c.fieldKey === key);
        return {
          fieldKey: key,
          label: config?.label || val.label || key,
          required: config?.required ?? val.required ?? true,
          visible: config?.visible ?? true,
        };
      });

      allBlockData.push({
        blockId: block._id,
        blockName: block.name,
        fields: mergedFields,
      });
    }

    res.json(allBlockData);
  } catch (err) {
    res.status(500).json({ error: 'Error loading all block fields', details: err.message });
  }
});

// ✅ POST: Save or update a field config — only for readwrite/superadmin
router.post('/save', checkAccessLevel, requireReadWrite, async (req, res) => {
  try {
    const { blockId, fieldKey, required, visible, label } = req.body;

    if (!blockId || !fieldKey) {
      return res.status(400).json({ error: 'blockId and fieldKey are required' });
    }

    const existing = await FieldConfig.findOne({ blockId, fieldKey });

    if (existing) {
      existing.required = required;
      existing.visible = visible;
      existing.label = label;
      await existing.save();
    } else {
      await FieldConfig.create({ blockId, fieldKey, required, visible, label });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error saving field config:', err.message);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

export default router;
