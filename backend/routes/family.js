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
    console.error('❌ Failed to fetch family members:', err);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// POST add new family member
router.post('/', async (req, res) => {
  try {
    // The image field will be part of req.body if sent from the frontend
    const newMember = new FamilyMember(req.body);
    await newMember.save();
    res.status(201).json(newMember);
  } catch (err) {
    console.error('❌ Failed to add family member:', err);
    res.status(500).json({ error: 'Failed to add family member' });
  }
});

// PUT update family member (delete + recreate)
// This method is generally discouraged for updates as it loses document history and can cause race conditions.
// A PATCH method is usually preferred for partial updates.
// However, adhering to the provided structure:
router.put('/:id', async (req, res) => {
  try {
    // Find the existing member to ensure it belongs to the correct user if userId is part of the update criteria
    // For a PUT, we're replacing the entire resource, so req.body should contain all fields, including image.
    const existingMember = await FamilyMember.findById(req.params.id);
    if (!existingMember) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Ensure the userId in the request body matches the existing member's userId for security
    if (req.body.userId && req.body.userId !== existingMember.userId) {
      return res.status(403).json({ error: 'Unauthorized update for this user ID' });
    }

    // Delete the old document
    await FamilyMember.findByIdAndDelete(req.params.id);

    // Create a new document with the updated data (including image)
    const updated = new FamilyMember({
      ...req.body,
      _id: req.params.id, // Ensure the new document keeps the same ID
      createdAt: existingMember.createdAt // Preserve original creation date if desired
    });
    await updated.save();
    res.status(200).json(updated); // Use 200 OK for successful PUT
  } catch (err) {
    console.error('❌ Failed to update family member:', err);
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

// DELETE a family member
router.delete('/:id', async (req, res) => {
  try {
    const deletedMember = await FamilyMember.findByIdAndDelete(req.params.id);
    if (!deletedMember) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    res.json({ message: 'Family member deleted' });
  } catch (err) {
    console.error('❌ Failed to delete family member:', err);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

export default router;
