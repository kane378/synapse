// FILE: server/middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, email, role, hospital_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, error: 'Token invalid or user deactivated.' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }
    return res.status(500).json({ success: false, error: 'Authentication error.' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: `Access forbidden. Required role: ${roles.join(' or ')}.` });
    }
    next();
  };
};

const requireHospitalOwnership = (hospitalIdParam = 'hospitalId') => {
  return (req, res, next) => {
    if (req.user.role === 'SuperAdmin') return next();
    const targetHospitalId = req.params[hospitalIdParam] || req.body.hospital_id;
    if (req.user.hospital_id !== targetHospitalId) {
      return res.status(403).json({ success: false, error: 'Access forbidden. You can only manage your own hospital\'s data.' });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole, requireHospitalOwnership };
