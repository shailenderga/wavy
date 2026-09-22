const { getPool } = require('../config/db');

async function getRoomMessages(req, res) {
  try {
    const { roomId } = req.params;
    const pool = getPool();

    const [messages] = await pool.query(
      `SELECT m.id, m.room_id, m.sender_id, m.sender_name, m.receiver_id, m.receiver_name, m.content, m.message_type, m.media_url, m.created_at,
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

    // 1. Get sender name
    const [senderRows] = await pool.query('SELECT username, full_name FROM users WHERE id = ?', [senderId]);
    const senderName = senderRows[0]?.username || 'User';

    // 2. Check room type and get receiver (if direct message)
    const [roomRows] = await pool.query('SELECT id, name, type FROM rooms WHERE id = ?', [roomId]);
    let receiverId = null;
    let receiverName = null;

    if (roomRows.length > 0 && roomRows[0].type === 'direct') {
      const [memberRows] = await pool.query(
        `SELECT rm.user_id, u.username 
         FROM room_members rm 
         JOIN users u ON rm.user_id = u.id 
         WHERE rm.room_id = ? AND rm.user_id != ? 
         LIMIT 1`,
        [roomId, senderId]
      );
      if (memberRows.length > 0) {
        receiverId = memberRows[0].user_id;
        receiverName = memberRows[0].username;
      }
    } else if (roomRows.length > 0) {
      receiverName = `#${roomRows[0].name}`;
    }

    const [result] = await pool.query(
      'INSERT INTO messages (room_id, sender_id, sender_name, receiver_id, receiver_name, content, message_type, media_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [roomId, senderId, senderName, receiverId, receiverName, textContent, type, mediaUrl || null]
    );

    const [message] = await pool.query(
      `SELECT m.id, m.room_id, m.sender_id, m.sender_name, m.receiver_id, m.receiver_name, m.content, m.message_type, m.media_url, m.created_at,
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
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user.id);
    const pool = getPool();

    const [msgRows] = await pool.query(
      'SELECT id, room_id, sender_id FROM messages WHERE id = ?',
      [messageId]
    );

    if (msgRows.length === 0) {
      // Message already deleted
      return res.json({ success: true, messageId });
    }

    const message = msgRows[0];
    if (Number(message.sender_id) !== userId) {
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
    return res.status(500).json({ error: 'Failed to delete message: ' + err.message });
  }
}

async function clearRoomMessages(req, res) {
  try {
    const roomId = Number(req.params.roomId);
    const userId = Number(req.user.id);
    const pool = getPool();

    // Verify membership
    const [members] = await pool.query(
      'SELECT user_id FROM room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (members.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }

    await pool.query('DELETE FROM messages WHERE room_id = ?', [roomId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`room_${roomId}`).emit('room_messages_cleared', { roomId });
    }

    return res.json({ success: true, roomId, message: 'Chat cleared successfully' });
  } catch (err) {
    console.error('clearRoomMessages error:', err);
    return res.status(500).json({ error: 'Failed to clear chat: ' + err.message });
  }
}

module.exports = {
  getRoomMessages,
  sendMessage,
  deleteMessage,
  clearRoomMessages
};
