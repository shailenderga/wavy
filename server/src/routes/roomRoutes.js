const express = require('express');
const router = express.Router();
const { getRooms, createRoom, getOrCreateDirectRoom } = require('../controllers/roomController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', getRooms);
router.post('/channel', createRoom);
router.post('/direct', getOrCreateDirectRoom);

module.exports = router;
