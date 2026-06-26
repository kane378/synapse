// FILE: server/controllers/notificationController.js
const { query } = require('../config/db');

// GET /api/notifications — Get notifications for current hospital
const getNotifications = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications
       WHERE hospital_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.hospital_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
  }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
  try {
    if (!req.user.hospital_id) return res.json({ success: true, count: 0 });
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE hospital_id = $1 AND is_read = false',
      [req.user.hospital_id]
    );
    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch count.' });
  }
};

// PATCH /api/notifications/mark-read — Mark all as read
const markAllRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE hospital_id = $1',
      [req.user.hospital_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark read.' });
  }
};

// Helper to create notification (used internally)
const createNotification = async (hospitalId, type, title, message, transferId = null, inventoryId = null) => {
  try {
    await query(
      `INSERT INTO notifications (hospital_id, type, title, message, related_transfer_id, related_inventory_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [hospitalId, type, title, message, transferId, inventoryId]
    );
  } catch (err) {
    console.error('Create notification error:', err);
  }
};

module.exports = { getNotifications, getUnreadCount, markAllRead, createNotification };
