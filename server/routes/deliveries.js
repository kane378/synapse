// FILE: server/routes/deliveries.js
const express = require('express');
const router = express.Router();
const {
  getDeliveryMethods, createDelivery, updateDeliveryStatus,
  getDeliveryByTransfer, getDeliveries,
  getDeliveryByToken, updateDeliveryStatusByToken,
} = require('../controllers/deliveryController');
const { verifyToken, requireRole } = require('../middleware/auth');

// ── PUBLIC routes (no auth — for delivery agent) ──────────────────────────────
router.get('/track/:token', getDeliveryByToken);
router.patch('/track/:token/status', updateDeliveryStatusByToken);

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(verifyToken);
router.get('/methods', getDeliveryMethods);
router.get('/', getDeliveries);
router.get('/transfer/:transferId', getDeliveryByTransfer);
router.post('/', requireRole('HospitalAdmin', 'SuperAdmin'), createDelivery);
router.patch('/:id/status', requireRole('HospitalAdmin', 'SuperAdmin'), updateDeliveryStatus);

module.exports = router;
