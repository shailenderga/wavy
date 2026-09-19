const express = require('express');
const router = express.Router();
const { getRoomMessages, sendMessage } = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/:roomId', getRoomMessages);
router.post('/:roomId', sendMessage);

module.exports = router;
