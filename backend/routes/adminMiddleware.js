import AdminAccess from '../models/AdminAccess.js';

const SUPER_ADMIN = 'binduvarshasunkara@gmail.com';

// Middleware to check access level
export const checkAccessLevel = async (req, res, next) => {
  try {
    const email = req.headers['admin-email'];
    if (!email) return res.status(400).json({ error: 'Missing admin-email header' });

    if (email === SUPER_ADMIN) {
      req.adminRole = 'superadmin';
      return next();
    }

    const accessEntry = await AdminAccess.findOne({ email });
    if (!accessEntry) {
      return res.status(403).json({ error: '🚫 Access Denied. Not authorized.' });
    }

    req.adminRole = accessEntry.role; // 'readonly' or 'readwrite'
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error checking admin access', details: err.message });
  }
};

// Middleware for write-level access only
export const requireReadWrite = (req, res, next) => {
  if (req.adminRole !== 'readwrite' && req.adminRole !== 'superadmin') {
    return res.status(403).json({ error: '✏️ Write permission required' });
  }
  next();
};

// Middleware to allow only the super admin
export const isSuperAdmin = (req, res, next) => {
  const email = req.headers['admin-email'];
  if (email !== SUPER_ADMIN) {
    return res.status(403).json({ error: '🛡️ Only super admin allowed' });
  }
  next();
};
