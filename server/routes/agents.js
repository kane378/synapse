// FILE: server/routes/agents.js
const express = require('express');
const router = express.Router();
const { registerAgent, getAgents, verifyAgent, toggleAvailability, getMyDeliveries } = require('../controllers/agentController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Public — agent registration
router.post('/register', registerAgent);

// Protected
router.use(verifyToken);
router.get('/', getAgents);
router.get('/my-deliveries', getMyDeliveries);
router.patch('/:id/verify', requireRole('SuperAdmin'), verifyAgent);
router.patch('/:id/availability', toggleAvailability);

module.exports = router;
