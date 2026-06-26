// FILE: server/routes/inventory.js
const express = require('express');
const router = express.Router();
const { getInventory, getWasteAlerts, addInventory, updateInventory, deleteInventory } = require('../controllers/inventoryController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All inventory routes require authentication
router.use(verifyToken);

router.get('/', getInventory);
router.get('/waste-alerts', getWasteAlerts);
router.post('/', requireRole('HospitalAdmin', 'SuperAdmin'), addInventory);
router.put('/:id', requireRole('HospitalAdmin', 'SuperAdmin'), updateInventory);
router.delete('/:id', requireRole('HospitalAdmin', 'SuperAdmin'), deleteInventory);

module.exports = router;
