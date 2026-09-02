const express = require('express');
const { register, login, getMe } = require('../controller/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/loign', login); // Support typo alias for backwards compatibility
router.get('/me', authMiddleware, getMe);

module.exports = router;