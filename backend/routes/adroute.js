// routes/ad.routes.js
import express from 'express';
import Ad from '../models/ad.js';

const router = express.Router();

// GET all ads (only visible ones)
router.get('/', async (req, res) => {
  try {
    const ads = await Ad.find({ isHidden: false }).sort({ priority: 1, sequence: 1 });
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

// CREATE ad
router.post('/', async (req, res) => {
  try {
    const newAd = new Ad(req.body);
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

// TOGGLE hide/unhide ad
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

export default router;
