import express from 'express';
import PasswordCategory from '../models/PasswordCategory.js';
import savedForm from '../models/PasswordEntry.js';

const router = express.Router();

// GET all custom blocks for a user
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const blocks = await PasswordCategory.find({ userId });
    res.json(blocks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch custom blocks' });
  }
});

// POST add new custom block
router.post('/', async (req, res) => {
  const { userId, blockName } = req.body;
  if (!userId || !blockName) return res.status(400).json({ error: 'Missing fields' });

  try {
    const exists = await PasswordCategory.findOne({ userId, blockName });
    if (exists) return res.status(409).json({ error: 'Block already exists' });

    const newBlock = new PasswordCategory({ userId, blockName });
    await newBlock.save();
    res.status(201).json(newBlock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving block' });
  }
});

// DELETE block and all related saved passwords
// DELETE with query: /api/password-categories?userId=...&blockName=...
router.delete('/', async (req, res) => {
  const { userId, blockName } = req.query;
  if (!userId || !blockName) {
    return res.status(400).json({ error: 'Missing userId or blockName' });
  }

  try {
    // 1. Delete the custom block
    const deleted = await PasswordCategory.findOneAndDelete({ userId, blockName });
    if (!deleted) return res.status(404).json({ error: 'Block not found' });

    // 2. Delete all password entries related to that block
    const deletedPasswords = await savedForm.deleteMany({ userId, blockName });

    res.json({
      message: 'Block and related passwords deleted',
      deletedPasswords: deletedPasswords.deletedCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete error' });
  }
});

export default router;
