import express from 'express';
import AdminAccess from '../models/AdminAccess.js';

const router = express.Router();

const SUPER_ADMIN = 'binduvarshasunkara@gmail.com';

// Middleware to restrict to super admin only
const isSuperAdmin = (req, res, next) => {
  const email = req.headers['admin-email'];
  if (email !== SUPER_ADMIN) {
    return res.status(403).json({ error: 'Only super admin allowed' });
  }
  next();
};

// POST /api/admin-access/set - Add or update access
router.post('/set', isSuperAdmin, async (req, res) => {
  const { email, role } = req.body;
  if (!email || !['readonly', 'readwrite'].includes(role)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const updated = await AdminAccess.findOneAndUpdate({ email }, { role }, { upsert: true, new: true });
  res.json({ success: true, data: updated });
});

// GET /api/admin-access/role - Get role for current user
router.get('/role', async (req, res) => {
  const email = req.headers['admin-email'];
  if (!email) return res.status(400).json({ error: 'Email header required' });

  const found = await AdminAccess.findOne({ email });
  res.json({ role: found?.role || null });
});

// GET /api/admin-access/all - List all access entries (super admin only)
router.get('/all', isSuperAdmin, async (req, res) => {
  try {
    const entries = await AdminAccess.find().sort({ email: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch access list' });
  }
});

// DELETE /api/admin-access/:email - Delete access by email
router.delete('/:email', isSuperAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const deleted = await AdminAccess.findOneAndDelete({ email });

    if (!deleted) {
      return res.status(404).json({ error: 'Access entry not found' });
    }

    res.json({ success: true, message: `Access removed for ${email}` });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting access' });
  }
});
export default router;
