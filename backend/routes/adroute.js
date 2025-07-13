// routes/ad.routes.js
import express from 'express';
import multer from 'multer';
import Ad from '../models/ad.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Configure Multer for image uploads (in-memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Convert image buffer to base64
const bufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// GET all visible ads
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
      userOptions
    } = req.body;

    let contentBase64 = null;

    if (req.file) {
      contentBase64 = bufferToBase64(req.file.buffer, req.file.mimetype);
    }

    const newAd = new Ad({
      type,
      dimensions: Array.isArray(dimensions) ? dimensions : [dimensions],
      contentType,
      contentUrl: '', // optional if base64 is used
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
      userOptions: userOptions ? JSON.parse(userOptions) : []
    });

    const savedAd = await newAd.save();
    res.status(201).json(savedAd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE ad (no file update here)
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

export default router;
