// backend/routes/adminFieldConfig.js
import express from 'express';
import BlockMetadata from '../models/BlockMetadata.js';
import FieldConfig from '../models/FieldConfig.js'; // make sure this exists
import mongoose from 'mongoose';

const router = express.Router();

const isAdmin = (req, res, next) => {
  const email = req.headers['admin-email'];
  if (email !== 'binduvarshasunkara@gmail.com') {
    return res.status(403).json({ error: 'Unauthorized: Admins only' });
  }
  next();
};

router.get('/all-blocks-fields', isAdmin, async (req, res) => {
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

// ✅ This fixes your error:
export default router;
