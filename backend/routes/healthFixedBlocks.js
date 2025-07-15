const express = require('express');
const router = express.Router();
const HealthFixedBlock = require('../models/HealthFixedBlock');

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

module.exports = router;
