// FILE: server/routes/transfers.js
const express = require('express');
const router = express.Router();
const { getTransfers, requestTransfer, respondToTransfer, completeTransfer } = require('../controllers/transferController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', getTransfers);
router.post('/', requireRole('HospitalAdmin', 'SuperAdmin'), requestTransfer);
router.patch('/:id/respond', requireRole('HospitalAdmin', 'SuperAdmin'), respondToTransfer);
router.patch('/:id/complete', requireRole('HospitalAdmin', 'SuperAdmin'), completeTransfer);

module.exports = router;
