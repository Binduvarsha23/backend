import BlockMetadata from '../models/BlockMetadata.js';
import mongoose from 'mongoose';

// GET all blocks with their field definitions
router.get('/all-blocks-fields', isAdmin, async (req, res) => {
  try {
    const blocks = await BlockMetadata.find();

    const db = mongoose.connection.db;
    const allBlockData = [];

    for (let block of blocks) {
      const collection = db.collection(block.data_collection_name);
      const fieldDoc = await collection.findOne() || {};
      delete fieldDoc._id;

      const fieldConfigs = await FieldConfig.find({ blockId: block._id });

      // Merge config with base fields
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
