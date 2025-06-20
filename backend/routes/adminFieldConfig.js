import express from 'express';
import FieldConfig from '../models/FieldConfig.js';

const router = express.Router();

// ✅ Middleware to check admin
const isAdmin = (req, res, next) => {
  const email = req.headers['admin-email'];
  if (email !== 'binduvarshasunkara@gmail.com') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }
  next();
};

// GET all field configs for a block
router.get('/:blockId', isAdmin, async (req, res) => {
  const configs = await FieldConfig.find({ blockId: req.params.blockId });
  res.json(configs);
});

// UPDATE or ADD a field config
router.post('/:blockId', isAdmin, async (req, res) => {
  const { fieldKey, label, required, visible } = req.body;

  try {
    const updated = await FieldConfig.findOneAndUpdate(
      { blockId: req.params.blockId, fieldKey },
      { $set: { label, required, visible } },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error saving config', details: err.message });
  }
});

export default router;
