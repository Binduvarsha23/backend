import express from 'express';
import AdminAccess from '../models/AdminAccess.js';
import { checkAccessLevel, requireReadWrite, isSuperAdmin } from './adminMiddleware.js';

const router = express.Router();
const SUPER_ADMIN = 'binduvarshasunkara@gmail.com';

// 🔐 Only SUPER ADMIN can create new entries
router.post('/set', isSuperAdmin, async (req, res) => {
  const { email, role } = req.body;
  if (!email || !['readonly', 'readwrite'].includes(role)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  if (email === SUPER_ADMIN) {
    return res.status(403).json({ error: 'Cannot modify super admin role' });
  }

  const updated = await AdminAccess.findOneAndUpdate({ email }, { role }, { upsert: true, new: true });
  res.json({ success: true, data: updated });
});

// ✅ Get role for current user (readonly users can also access this)
router.get('/role', async (req, res) => {
  const email = req.headers['admin-email'];
  if (!email) return res.status(400).json({ error: 'Email header required' });

  if (email === SUPER_ADMIN) {
    return res.json({ role: 'superadmin' });
  }

  const found = await AdminAccess.findOne({ email });
  res.json({ role: found?.role || null });
});

// ✅ List all access entries (only superadmin and readwrite can see)
router.get('/all', checkAccessLevel, async (req, res) => {
  if (req.adminRole === 'readonly') {
    return res.status(403).json({ error: 'Readonly users cannot view access list' });
  }

  try {
    const entries = await AdminAccess.find().sort({ email: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch access list' });
  }
});

// ✅ Delete access (superadmin or readwrite)
router.delete('/:email', checkAccessLevel, requireReadWrite, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    if (email === SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot remove super admin' });
    }

    const deleted = await AdminAccess.findOneAndDelete({ email });
    if (!deleted) return res.status(404).json({ error: 'Access entry not found' });

    res.json({ success: true, message: `Access removed for ${email}` });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting access' });
  }
});

export default router;
