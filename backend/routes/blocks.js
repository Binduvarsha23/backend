import express from 'express';
import BlockMetadata from '../models/BlockMetadata.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const blocks = await BlockMetadata.find();
    res.json(blocks);
  } catch (err) {
    console.error("❌ Error fetching blocks:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
