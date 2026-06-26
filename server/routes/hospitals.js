// FILE: server/routes/hospitals.js
const express = require('express');
const router = express.Router();
const { getHospitals, verifyHospital, getDashboardStats } = require('../controllers/hospitalController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', getHospitals);
router.get('/stats', getDashboardStats);
router.patch('/:id/verify', requireRole('SuperAdmin'), verifyHospital);

module.exports = router;
