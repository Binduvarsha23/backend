import express from 'express';
import HealthFixedBlock from '../models/HealthFixedBlock.js';

const router = express.Router();

// GET all fixed blocks
router.get('/', async (req, res) => {
  try {
    const blocks = await HealthFixedBlock.find({});
    res.json(blocks);
  } catch (err) {
    console.error('Error fetching fixed blocks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
