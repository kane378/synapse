// FILE: server/routes/notifications.js
const express = require('express');
const router = express.Router();
const { getNotifications, getUnreadCount, markAllRead } = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/mark-read', markAllRead);

module.exports = router;
