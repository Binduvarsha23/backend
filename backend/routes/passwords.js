import express from 'express';
import PasswordEntry from '../models/PasswordEntry.js';

const router = express.Router();

// POST /api/passwords
router.post('/', async (req, res) => {
  const { userId, blockName, data } = req.body;
  if (!userId || !blockName || !data) return res.status(400).json({ error: 'Missing fields' });

  try {
    const entry = new PasswordEntry({ userId, blockName, data });
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('❌ Save Error:', err);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// GET /api/passwords?userId=xyz
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const entries = await PasswordEntry.find({ userId }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    console.error('❌ Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.patch('/:id/favorite', async (req, res) => {
  try {
    const entry = await PasswordEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Password entry not found' });
    entry.favorite = !entry.favorite;
    await entry.save();
    res.json({ success: true, favorite: entry.favorite });
  } catch (err) {
    console.error('❌ Favorite toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// DELETE /api/passwords/:id
router.delete('/:id', async (req, res) => {
  try {
    await PasswordEntry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('❌ Delete Error:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
