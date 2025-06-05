import express from 'express';
import FormData from '../models/FormData.js';

const router = express.Router();

// POST /api/save-form
router.post('/', async (req, res) => {
  const { blockId, blockName, data, userId } = req.body;

  if (!blockId || !blockName || !userId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const newForm = new FormData({
      blockId,
      blockName,
      data,
      userId,
    });

    const saved = await newForm.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error saving form data:", error);
    res.status(500).json({ error: "Server error saving form data" });
  }
});

export default router;
