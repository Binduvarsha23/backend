// File: routes/healthBlocks.js
import express from 'express';
import HealthBlock from '../models/HealthBlock.js';

const router = express.Router();

// GET all blocks for a user
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const blocks = await HealthBlock.find({ userId }).sort({ createdAt: -1 });
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blocks" });
  }
});

// POST a new custom block
router.post('/', async (req, res) => {
  const { userId, blockName } = req.body;
  if (!userId || !blockName) return res.status(400).json({ error: "Missing userId or blockName" });

  try {
    const newBlock = await HealthBlock.create({ userId, blockName });
    res.status(201).json(newBlock);
  } catch (err) {
    res.status(500).json({ error: "Failed to create block" });
  }
});

// PATCH block name
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { blockName } = req.body;

  if (!blockName) return res.status(400).json({ error: "Missing blockName" });

  try {
    const updated = await HealthBlock.findByIdAndUpdate(id, { blockName }, { new: true });
    if (!updated) return res.status(404).json({ error: "Block not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE a custom block
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await HealthBlock.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
