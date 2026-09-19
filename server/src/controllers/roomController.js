const { getPool } = require('../config/db');

async function getRooms(req, res) {
  try {
    const userId = req.user.id;
    const pool = getPool();

    // Fetch all public group rooms
    const [groupRooms] = await pool.query(
      'SELECT id, name, description, type, created_at FROM rooms WHERE type = "group" ORDER BY id ASC'
    );

    // Fetch direct message rooms involving this user ONLY if they are accepted contacts
    const [directRooms] = await pool.query(
      `SELECT r.id, r.name, r.type, r.created_at,
              u.id AS other_user_id, u.username AS other_username, u.avatar_url AS other_avatar_url, u.status AS other_status
       FROM rooms r
       JOIN room_members rm ON r.id = rm.room_id
       JOIN room_members rm2 ON r.id = rm2.room_id AND rm2.user_id != ?
       JOIN users u ON rm2.user_id = u.id
       JOIN contact_requests cr ON (
         (cr.sender_id = ? AND cr.receiver_id = u.id) OR 
         (cr.sender_id = u.id AND cr.receiver_id = ?)
       ) AND cr.status = 'accepted'
       WHERE rm.user_id = ? AND r.type = 'direct'`,
      [userId, userId, userId, userId]
    );

    return res.json({
      channels: groupRooms,
      directRooms: directRooms.map(dr => ({
        id: dr.id,
        name: dr.other_username,
        type: 'direct',
        otherUser: {
          id: dr.other_user_id,
          username: dr.other_username,
          avatar_url: dr.other_avatar_url,
          status: dr.other_status
        },
        created_at: dr.created_at
      }))
    });
  } catch (err) {
    console.error('getRooms error:', err);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
}

async function createRoom(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const pool = getPool();
    const formattedName = name.toLowerCase().replace(/\s+/g, '-');

    const [result] = await pool.query(
      'INSERT INTO rooms (name, description, type) VALUES (?, ?, "group")',
      [formattedName, description || '']
    );

    const newRoom = {
      id: result.insertId,
      name: formattedName,
      description: description || '',
      type: 'group'
    };

    return res.status(201).json({ room: newRoom });
  } catch (err) {
    console.error('createRoom error:', err);
    return res.status(500).json({ error: 'Failed to create room' });
  }
}

async function getOrCreateDirectRoom(req, res) {
  try {
    const currentUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Valid target user ID is required' });
    }

    const pool = getPool();

    // Verify that an accepted contact relationship exists
    const [contactCheck] = await pool.query(
      `SELECT id FROM contact_requests 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) 
         AND status = 'accepted'`,
      [currentUserId, targetUserId, targetUserId, currentUserId]
    );

    if (contactCheck.length === 0) {
      return res.status(403).json({
        error: 'You can only chat after your contact request has been accepted.'
      });
    }

    // Check if direct room exists between currentUserId and targetUserId
    const [existing] = await pool.query(
      `SELECT r.id, r.name, r.type 
       FROM rooms r
       JOIN room_members rm1 ON r.id = rm1.room_id AND rm1.user_id = ?
       JOIN room_members rm2 ON r.id = rm2.room_id AND rm2.user_id = ?
       WHERE r.type = 'direct'
       LIMIT 1`,
      [currentUserId, targetUserId]
    );

    // Fetch target user info
    const [targetUsers] = await pool.query(
      'SELECT id, username, avatar_url, status FROM users WHERE id = ?',
      [targetUserId]
    );

    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const targetUser = targetUsers[0];

    if (existing.length > 0) {
      return res.json({
        room: {
          id: existing[0].id,
          name: targetUser.username,
          type: 'direct',
          otherUser: targetUser
        }
      });
    }

    // Create new direct room
    const [newRoomResult] = await pool.query(
      'INSERT INTO rooms (name, type) VALUES (?, "direct")',
      [`dm-${currentUserId}-${targetUserId}`]
    );

    const roomId = newRoomResult.insertId;

    // Add both users to room_members
    await pool.query(
      'INSERT INTO room_members (room_id, user_id) VALUES (?, ?), (?, ?)',
      [roomId, currentUserId, roomId, targetUserId]
    );

    return res.status(201).json({
      room: {
        id: roomId,
        name: targetUser.username,
        type: 'direct',
        otherUser: targetUser
      }
    });
  } catch (err) {
    console.error('getOrCreateDirectRoom error:', err);
    return res.status(500).json({ error: 'Failed to access direct chat' });
  }

}

module.exports = {
  getRooms,
  createRoom,
  getOrCreateDirectRoom
};
