// backend/routes/securityConfig.js
import express from 'express';
import SecurityConfig from '../models/SecurityConfig.js';

const router = express.Router();

// Get user's config
router.get('/:userId', async (req, res) => {
  try {
    const config = await SecurityConfig.findOne({ userId: req.params.userId });
    if (!config) return res.status(404).json({ message: 'Config not found' });
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching config' });
  }
});

// Create default config
router.post('/', async (req, res) => {
  const { userId } = req.body;
  try {
    const existing = await SecurityConfig.findOne({ userId });
    if (existing) return res.status(400).json({ message: 'Already exists' });
    const config = new SecurityConfig({ userId });
    await config.save();
    res.status(201).json(config);
  } catch (err) {
    res.status(500).json({ message: 'Error creating config' });
  }
});

// Update (enable password or pin, disable the other)
router.put('/:userId', async (req, res) => {
  const { userId } = req.body;
  try {
    const update = {};

    if (req.body.passwordEnabled) {
      update.passwordEnabled = true;
      update.pinEnabled = false;
      if (req.body.passwordHash) update.passwordHash = req.body.passwordHash;
    } else if (req.body.pinEnabled) {
      update.pinEnabled = true;
      update.passwordEnabled = false;
      if (req.body.pinHash) update.pinHash = req.body.pinHash;
    }

    if (req.body.passwordEnabled === false) update.passwordEnabled = false;
    if (req.body.pinEnabled === false) update.pinEnabled = false;

    const config = await SecurityConfig.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: update },
      { new: true }
    );

    if (!config) return res.status(404).json({ message: 'Config not found' });
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: 'Error updating config' });
  }
});

// Verify password or pin
router.post('/verify', async (req, res) => {
  const { userId, value, method } = req.body;
  try {
    const config = await SecurityConfig.findOne({ userId });
    if (!config) return res.status(404).json({ message: 'Config not found' });

    const bcrypt = await import('bcryptjs');
    const isMatch = await bcrypt.compare(
      value,
      method === 'pin' ? config.pinHash : config.passwordHash
    );

    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed' });
  }
});

export default router;
