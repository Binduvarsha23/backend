import express from 'express';
import PasswordField from '../models/PasswordField.js';

const router = express.Router();

// GET all fields
router.get('/', async (req, res) => {
  try {
    const fields = await PasswordField.find({ visible: true }).sort({ order: 1 });
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load fields' });
  }
});

// POST create a new field (ADMIN)
router.post('/', async (req, res) => {
  const { key, label, placeholder, helperText, required, visible, order } = req.body;

  if (!key || !label) return res.status(400).json({ error: 'Key and Label are required' });

  try {
    const exists = await PasswordField.findOne({ key });
    if (exists) return res.status(409).json({ error: 'Field already exists' });

    const newField = new PasswordField({ key, label, placeholder, helperText, required, visible, order });
    await newField.save();
    res.status(201).json(newField);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create field' });
  }
});

export default router;
