// routes/ad.routes.js
import express from 'express';
import multer from 'multer';
import Ad from '../models/ad.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const bufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// GET all visible ads (filter out hidden, inactive, or hold)
router.get('/', async (req, res) => {
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

// GET single ad
router.get('/:id', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE ad with image upload
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

// UPDATE ad
router.put('/:id', async (req, res) => {
  try {
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

// HIDE / UNHIDE ad
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

// UPDATE ad status (active, hold, inactive)
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

// DELETE expired ads automatically (you can call this periodically via cron)
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
