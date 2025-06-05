import express from 'express';
import FormData from '../models/FormData.js';

const router = express.Router();

// GET /api/saved-forms/:blockId?userId=xyz
router.get('/:blockId', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId in query params" });
  }

  try {
    const forms = await FormData.find({
      blockId: req.params.blockId,
      userId,
    }).sort({ createdAt: -1 });

    res.json(forms);
  } catch (error) {
    console.error("Error fetching saved forms:", error);
    res.status(500).json({ error: 'Server error fetching saved forms' });
  }
});

export default router;
