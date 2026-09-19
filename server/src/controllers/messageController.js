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

module.exports = {
  getRoomMessages,
  sendMessage
};
