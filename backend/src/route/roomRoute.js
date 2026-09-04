const express = require('express');
const { createRoom, checkRoom } = require('../controller/roomController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/create-room', authMiddleware, createRoom);
router.post('/create-room', authMiddleware, createRoom); // Support POST as well if called via POST
router.post('/check-room', authMiddleware, checkRoom);

module.exports = router;