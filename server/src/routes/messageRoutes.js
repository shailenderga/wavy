const express = require('express');
const router = express.Router();
const {
  getRoomMessages,
  sendMessage,
  deleteMessage,
  clearRoomMessages
} = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/:roomId', getRoomMessages);
router.post('/:roomId', sendMessage);
router.delete('/room/:roomId/clear', clearRoomMessages);
router.delete('/:messageId', deleteMessage);

module.exports = router;
