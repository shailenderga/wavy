const { getPool } = require('../config/db');

async function getRoomMessages(req, res) {
  try {
    const { roomId } = req.params;
    const pool = getPool();

    const [messages] = await pool.query(
      `SELECT m.id, m.room_id, m.sender_id, m.content, m.message_type, m.media_url, m.created_at,
              u.username AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.room_id = ?
       ORDER BY m.created_at ASC`,
      [roomId]
    );

    return res.json({ messages });
  } catch (err) {
    console.error('getRoomMessages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

async function sendMessage(req, res) {
  try {
    const { roomId } = req.params;
    const { content, messageType, mediaUrl } = req.body;
    const senderId = req.user.id;

    const type = ['image', 'audio'].includes(messageType) ? messageType : 'text';
    const textContent = (content || (type === 'image' ? 'Photo' : type === 'audio' ? 'Voice note' : '')).trim();

    if (type === 'text' && !textContent) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const pool = getPool();

    const [result] = await pool.query(
      'INSERT INTO messages (room_id, sender_id, content, message_type, media_url) VALUES (?, ?, ?, ?, ?)',
      [roomId, senderId, textContent, type, mediaUrl || null]
    );

    const [message] = await pool.query(
      `SELECT m.id, m.room_id, m.sender_id, m.content, m.message_type, m.media_url, m.created_at,
              u.username AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ message: message[0] });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const pool = getPool();

    const [msgRows] = await pool.query(
      'SELECT id, room_id, sender_id FROM messages WHERE id = ?',
      [messageId]
    );

    if (msgRows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = msgRows[0];
    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await pool.query('DELETE FROM messages WHERE id = ?', [messageId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`room_${message.room_id}`).emit('message_deleted', {
        messageId: parseInt(messageId, 10),
        roomId: message.room_id
      });
    }

    return res.json({ success: true, messageId: parseInt(messageId, 10) });
  } catch (err) {
    console.error('deleteMessage error:', err);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
}

module.exports = {
  getRoomMessages,
  sendMessage,
  deleteMessage
};
