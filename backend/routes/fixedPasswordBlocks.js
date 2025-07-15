// routes/fixedPasswordBlocks.js
import express from 'express';
import FixedPasswordBlock from '../models/FixedPasswordBlock.js';

const router = express.Router();

// GET all fixed password blocks
router.get('/', async (req, res) => {
  try {
    const blocks = await FixedPasswordBlock.find();
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fixed blocks' });
  }
});

// ✅ ADD new fixed block (for Admin use)
router.post('/', async (req, res) => {
  const { blockName, icon, summary } = req.body;

  if (!blockName || !icon) {
    return res.status(400).json({ error: 'blockName and icon are required' });
  }

  try {
    const existing = await FixedPasswordBlock.findOne({ blockName });
    if (existing) {
      return res.status(409).json({ error: 'Block already exists' });
    }

    const newBlock = new FixedPasswordBlock({ blockName, icon, summary });
    await newBlock.save();
    res.status(201).json({ success: true, block: newBlock });
  } catch (err) {
    console.error('Error adding fixed block:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
