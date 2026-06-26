// FILE: server/routes/certificates.js
const express = require('express');
const router = express.Router();
const { generateCertificate, getCertificate } = require('../controllers/certificateController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.post('/generate', generateCertificate);
router.get('/:transferId', getCertificate);

module.exports = router;
