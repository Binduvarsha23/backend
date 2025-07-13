import express from 'express';
import multer from 'multer';
import Ad from '../models/ad.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const bufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// 🔓 Admin: Get ALL ads except expired
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const ads = await Ad.find({
      endTime: { $gte: now } // Only exclude expired
    }).sort({ priority: 1, sequence: 1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔒 Users: Only show running, visible, active ads
router.get('/public', async (req, res) => {
  try {
    const now = new Date();
    const ads = await Ad.find({
      isHidden: false,
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).sort({ priority: 1, sequence: 1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single ad by ID
router.get('/:id', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE new ad with file upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      type,
      dimensions,
      contentType,
      startTime,
      endTime,
      priority,
      platform,
      redirectUrl,
      ctaText,
      sequence,
      header,
      summary,
      userOptions,
      status = 'active'
    } = req.body;

    let contentBase64 = null;
    if (req.file) {
      contentBase64 = bufferToBase64(req.file.buffer, req.file.mimetype);
    }

    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
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
    });

    const savedAd = await newAd.save();
    res.status(201).json(savedAd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE existing ad
router.put('/:id', async (req, res) => {
  try {
    const { startTime, endTime } = req.body;

    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const updatedAd = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedAd) return res.status(404).json({ error: 'Ad not found' });
    res.json(updatedAd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE ad
router.delete('/:id', async (req, res) => {
  try {
    const deletedAd = await Ad.findByIdAndDelete(req.params.id);
    if (!deletedAd) return res.status(404).json({ error: 'Ad not found' });
    res.json({ message: 'Ad deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// TOGGLE HIDE/UNHIDE ad
router.patch('/:id/hide', async (req, res) => {
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

// UPDATE ad status: active / hold / inactive
router.patch('/:id/status', async (req, res) => {
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

// CRON: Delete expired ads
router.delete('/expired/cleanup', async (req, res) => {
  try {
    const now = new Date();
    const result = await Ad.deleteMany({ endTime: { $lt: now } });
    res.json({ message: `Deleted ${result.deletedCount} expired ads` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
