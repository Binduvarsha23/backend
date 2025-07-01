// File: routes/family.js
import express from 'express';
import FamilyMember from '../models/FamilyMember.js';

const router = express.Router();

// GET all family members for a user
router.get('/', async (req, res) => {
  const { userId } = req.query;
  try {
    const members = await FamilyMember.find({ userId });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// POST add new family member
router.post('/', async (req, res) => {
  try {
    const newMember = new FamilyMember(req.body);
    await newMember.save();
    res.status(201).json(newMember);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add family member' });
  }
});

// PUT update family member (delete + recreate)
router.put('/:id', async (req, res) => {
  try {
    await FamilyMember.findByIdAndDelete(req.params.id);
    const updated = new FamilyMember(req.body);
    await updated.save();
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

// DELETE a family member
router.delete('/:id', async (req, res) => {
  try {
    await FamilyMember.findByIdAndDelete(req.params.id);
    res.json({ message: 'Family member deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

export default router;
