import express from 'express';
import Nominee from '../models/Nominee.js';
import Family from '../models/FamilyMember.js';
import Asset from '../models/Asset.js';
import Investment from '../models/Investment.js';
import NodeCache from 'node-cache';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 60 }); // 60 seconds TTL

// ✅ GET all nominees for a user (with enriched assetName or investmentName)
router.get('/', async (req, res) => {
  const { userId } = req.query;
  const cacheKey = `nominees-${userId}`;

  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  try {
    const nominees = await Nominee.find({ userId }).lean();

    for (let nominee of nominees) {
      if (nominee.type === 'asset') {
        const asset = await Asset.findById(nominee.itemId);
        nominee.assetName = asset?.name || 'Unnamed Asset';
      } else if (nominee.type === 'investment') {
        const investment = await Investment.findById(nominee.itemId);
        nominee.assetName = investment?.name || 'Unnamed Investment';
      }
    }

    cache.set(cacheKey, nominees);
    res.json(nominees);
  } catch (error) {
    console.error('❌ Failed to fetch nominees:', error);
    res.status(500).json({ error: 'Failed to fetch nominees' });
  }
});

// ✅ POST create new nominee
router.post('/', async (req, res) => {
  const { userId, type, itemId, percentage, nomineeId, favorite = false } = req.body;

  if (percentage < 0) {
    return res.status(400).json({ error: 'Percentage cannot be negative' });
  }

  try {
    const existing = await Nominee.find({ userId, type, itemId });
    const total = existing.reduce((acc, n) => acc + n.percentage, 0);

    if (total + percentage > 100) {
      return res.status(400).json({ error: 'Total allocation exceeds 100%' });
    }

    let nomineeName, nomineeRelation;

    if (nomineeId === "self") {
      nomineeName = "Self";
      nomineeRelation = "Self";
    } else {
      const family = await Family.findById(nomineeId);
      if (!family) return res.status(404).json({ error: 'Nominee not found' });

      nomineeName = family.fullName;
      nomineeRelation = family.relation;
    }

    const nominee = new Nominee({
      userId,
      type,
      itemId,
      percentage,
      nomineeId,
      nomineeName,
      nomineeRelation,
      favorite,
    });

    await nominee.save();
    cache.del(`nominees-${userId}`);
    res.status(201).json(nominee);
  } catch (err) {
    console.error("❌ Failed to save nominee:", err);
    res.status(500).json({ error: 'Failed to save nominee' });
  }
});

// ✅ PATCH update nominee
router.patch('/:id', async (req, res) => {
  const { type, itemId, percentage, nomineeId, userId, favorite } = req.body;

  if (percentage < 0) {
    return res.status(400).json({ error: 'Percentage cannot be negative' });
  }

  try {
    const existing = await Nominee.find({
      userId,
      type,
      itemId,
      _id: { $ne: req.params.id }
    });
    const total = existing.reduce((acc, n) => acc + n.percentage, 0);

    if (total + percentage > 100) {
      return res.status(400).json({ error: 'Total allocation exceeds 100%' });
    }

    let nomineeName, nomineeRelation;

    if (nomineeId === "self") {
      nomineeName = "Self";
      nomineeRelation = "Self";
    } else {
      const family = await Family.findById(nomineeId);
      if (!family) return res.status(404).json({ error: 'Nominee not found' });

      nomineeName = family.fullName;
      nomineeRelation = family.relation;
    }

    const updated = await Nominee.findByIdAndUpdate(
      req.params.id,
      {
        type,
        itemId,
        percentage,
        nomineeId,
        nomineeName,
        nomineeRelation,
        ...(favorite !== undefined && { favorite }),
      },
      { new: true }
    );

    cache.del(`nominees-${userId}`);
    res.json(updated);
  } catch (err) {
    console.error("❌ Failed to update nominee:", err);
    res.status(500).json({ error: 'Failed to update nominee' });
  }
});

// ✅ PATCH toggle favorite for nominee
router.patch('/:id/favorite', async (req, res) => {
  try {
    const nominee = await Nominee.findById(req.params.id);
    if (!nominee) return res.status(404).json({ error: 'Nominee not found' });

    nominee.favorite = !nominee.favorite;
    await nominee.save();

    cache.del(`nominees-${nominee.userId}`);
    res.json({ success: true, favorite: nominee.favorite });
  } catch (err) {
    console.error('❌ Toggle favorite error:', err);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// ✅ DELETE nominee
router.delete('/:id', async (req, res) => {
  try {
    const nominee = await Nominee.findById(req.params.id);
    if (!nominee) return res.status(404).json({ error: 'Nominee not found' });

    await Nominee.findByIdAndDelete(req.params.id);
    cache.del(`nominees-${nominee.userId}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete nominee' });
  }
});

export default router;
