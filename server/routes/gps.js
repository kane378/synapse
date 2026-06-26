// FILE: server/routes/gps.js
const express = require('express');
const router = express.Router();
const { updateLocation, getLatestLocation, getLocationTrail } = require('../controllers/gpsController');
const { verifyToken } = require('../middleware/auth');

// PUBLIC — agent sends location (no auth needed, uses delivery token)
router.post('/location/:token', updateLocation);

// PROTECTED — hospitals fetch agent location
router.get('/latest/:deliveryId', verifyToken, getLatestLocation);
router.get('/trail/:deliveryId', verifyToken, getLocationTrail);

module.exports = router;
