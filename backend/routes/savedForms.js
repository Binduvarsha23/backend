import express from 'express';
import FormData from '../models/FormData.js';

const router = express.Router();
// DELETE /api/saved-forms/:id
router.delete('/:id', async (req, res) => {
  try {
    const deletedForm = await FormData.findByIdAndDelete(req.params.id);
    if (!deletedForm) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json({ message: 'Form deleted successfully' });
  } catch (err) {
    console.error('❌ Deletion error:', err.message);
    res.status(500).json({ error: 'Server error during deletion' });
  }
});

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
