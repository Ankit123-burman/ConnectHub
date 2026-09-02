const express = require('express');
const { createRoom } = require('../controller/roomController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/create-room', authMiddleware, createRoom);
router.post('/create-room', authMiddleware, createRoom); // Support POST as well if called via POST

module.exports = router;