// FILE: server/routes/auth.js
const express = require('express');
const router = express.Router();
const { login, registerHospital, getMe } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

router.post('/login', authLimiter, login);
router.post('/register', registerHospital);
router.get('/me', verifyToken, getMe);

module.exports = router;
