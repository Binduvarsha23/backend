// File: routes/healthRecords.js
import express from 'express';
import HealthFile from '../models/HealthFile.js';

const router = express.Router();

// Upload new health file
router.post('/upload', async (req, res) => {
  const { userId, blockName, fileName, fileData } = req.body;

  if (!userId || !blockName || !fileName || !fileData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Initialize favorite to false by default for new uploads
    const newFile = new HealthFile({ userId, blockName, fileName, fileData, favorite: false });
    await newFile.save();
    res.status(201).json({ message: 'File uploaded successfully', file: newFile });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Server error while uploading' });
  }
});

// Get all health files for a user
router.get('/', async (req, res) => {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const files = await HealthFile.find({ userId }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Server error while fetching files' });
  }
});

// Edit a health file (name/block/data)
router.patch('/:id', async (req, res) => {
  const { blockName, fileName, fileData } = req.body;

  try {
    const file = await HealthFile.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (blockName) file.blockName = blockName;
    if (fileName) file.fileName = fileName;
    if (fileData) file.fileData = fileData;

    await file.save();
    res.json({ message: 'File updated successfully', file });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Server error during update' });
  }
});

// PATCH /api/health-records/:id/favorite - Toggle favorite status
router.patch('/:id/favorite', async (req, res) => {
  try {
    const file = await HealthFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'Health file not found' });
    }

    file.favorite = !file.favorite; // Toggle the favorite boolean
    await file.save();

    res.json({ success: true, favorite: file.favorite });
  } catch (err) {
    console.error('❌ Toggle favorite error for health file:', err);
    res.status(500).json({ error: 'Failed to toggle favorite status for health file' });
  }
});

// Delete a health file
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await HealthFile.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'File not found' });

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Server error during delete' });
  }
});

export default router;
