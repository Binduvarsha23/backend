import express from 'express';
import multer from 'multer';
import Ad from '../models/ad.js';
import { checkAccessLevel, requireReadWrite } from './adminaccess.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

const bufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// Public: Visible ads for users
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const ads = await Ad.find({
      isHidden: false,
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gte: now }
    })
      .select('-comment')
      .sort({ priority: 1, sequence: 1 });

    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin View: All future and current ads
router.get('/admin/all', checkAccessLevel, async (req, res) => {
  try {
    const now = new Date();
    const ads = await Ad.find({ endTime: { $gte: now } }).sort({ priority: 1, sequence: 1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get by ID
router.get('/:id', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Ad
router.post('/', checkAccessLevel, requireReadWrite, upload.single('image'), async (req, res) => {
  try {
    const {
      type, dimensions, contentType, startTime, endTime, priority,
      platform, redirectUrl, ctaText, sequence, header, summary,
      userOptions, status = 'active', comment
    } = req.body;

    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    let contentBase64 = null;
    if (req.file) {
      contentBase64 = bufferToBase64(req.file.buffer, req.file.mimetype);
    }

    const newAd = new Ad({
      type,
      dimensions: Array.isArray(dimensions) ? dimensions : [dimensions],
      contentType,
      contentUrl: '',
      contentBase64,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      priority,
      platform,
      redirectUrl,
      ctaText,
      sequence,
      header,
      summary,
      userOptions: userOptions ? JSON.parse(userOptions) : [],
      status,
      comment
    });

    const savedAd = await newAd.save();
    res.status(201).json(savedAd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Ad
router.put('/:id', checkAccessLevel, requireReadWrite, async (req, res) => {
  try {
    const updatedAd = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedAd) return res.status(404).json({ error: 'Ad not found' });
    res.json(updatedAd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Ad
router.delete('/:id', checkAccessLevel, requireReadWrite, async (req, res) => {
  try {
    const deletedAd = await Ad.findByIdAndDelete(req.params.id);
    if (!deletedAd) return res.status(404).json({ error: 'Ad not found' });
    res.json({ message: 'Ad deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Hide/Unhide
router.patch('/:id/hide', checkAccessLevel, requireReadWrite, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    ad.isHidden = !ad.isHidden;
    await ad.save();
    res.json({ message: ad.isHidden ? 'Ad hidden' : 'Ad unhidden' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Change Status
router.patch('/:id/status', checkAccessLevel, requireReadWrite, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'hold', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const ad = await Ad.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cleanup expired ads
router.delete('/expired/cleanup', checkAccessLevel, requireReadWrite, async (req, res) => {
  try {
    const now = new Date();
    const result = await Ad.deleteMany({ endTime: { $lt: now } });
    res.json({ message: `Deleted ${result.deletedCount} expired ads` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
