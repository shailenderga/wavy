const { getPool } = require('../config/db');

// Search users by username or email and return relationship status
async function searchUsers(req, res) {
  try {
    const currentUserId = req.user.id;
    const query = (req.query.q || '').trim();
    const pool = getPool();

    let sql = `
      SELECT u.id, u.username, u.email, u.avatar_url, u.about, u.status, u.created_at,
             cr1.status AS sent_status,
             cr2.status AS received_status,
             cr1.id AS sent_request_id,
             cr2.id AS received_request_id
      FROM users u
      LEFT JOIN contact_requests cr1 ON cr1.sender_id = ? AND cr1.receiver_id = u.id
      LEFT JOIN contact_requests cr2 ON cr2.sender_id = u.id AND cr2.receiver_id = ?
      WHERE u.id != ?
    `;
    const params = [currentUserId, currentUserId, currentUserId];

    if (query) {
      sql += ` AND (LOWER(u.username) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))`;
      params.push(`%${query}%`, `%${query}%`);
    }

    sql += ` ORDER BY u.username ASC LIMIT 50`;

    const [users] = await pool.query(sql, params);

    const formattedUsers = users.map((u) => {
      let relationship = 'none';
      let requestId = null;

      if (u.sent_status === 'accepted' || u.received_status === 'accepted') {
        relationship = 'accepted';
      } else if (u.sent_status === 'pending') {
        relationship = 'pending_sent';
        requestId = u.sent_request_id;
      } else if (u.received_status === 'pending') {
        relationship = 'pending_received';
        requestId = u.received_request_id;
      }

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        avatar_url: u.avatar_url,
        about: u.about || 'Hey there! I am using Wavy.',
        status: u.status,
        created_at: u.created_at,
        relationship,
        requestId
      };
    });

    return res.json({ users: formattedUsers });
  } catch (err) {
    console.error('searchUsers error:', err);
    return res.status(500).json({ error: 'Failed to search users' });
  }
}

// Get detailed profile of a specific user
async function getUserProfile(req, res) {
  try {
    const currentUserId = req.user.id;
    const targetUserId = parseInt(req.params.userId, 10);

    if (!targetUserId) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    const pool = getPool();

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.email, u.avatar_url, u.about, u.status, u.created_at,
              cr1.status AS sent_status,
              cr2.status AS received_status,
              cr1.id AS sent_request_id,
              cr2.id AS received_request_id
       FROM users u
       LEFT JOIN contact_requests cr1 ON cr1.sender_id = ? AND cr1.receiver_id = u.id
       LEFT JOIN contact_requests cr2 ON cr2.sender_id = u.id AND cr2.receiver_id = ?
       WHERE u.id = ?`,
      [currentUserId, currentUserId, targetUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = users[0];
    let relationship = 'none';
    let requestId = null;

    if (u.sent_status === 'accepted' || u.received_status === 'accepted') {
      relationship = 'accepted';
    } else if (u.sent_status === 'pending') {
      relationship = 'pending_sent';
      requestId = u.sent_request_id;
    } else if (u.received_status === 'pending') {
      relationship = 'pending_received';
      requestId = u.received_request_id;
    }

    return res.json({
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        avatar_url: u.avatar_url,
        about: u.about || 'Hey there! I am using Wavy.',
        status: u.status,
        created_at: u.created_at,
        relationship,
        requestId
      }
    });
  } catch (err) {
    console.error('getUserProfile error:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}

// Send a contact request
async function sendRequest(req, res) {
  try {
    const senderId = req.user.id;
    const { receiverId, username } = req.body;
    const pool = getPool();

    let targetId = receiverId;

    if (!targetId && username) {
      const [found] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
      if (found.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      targetId = found[0].id;
    }

    if (!targetId || targetId === senderId) {
      return res.status(400).json({ error: 'Invalid user to send request to' });
    }

    // Check existing request in either direction
    const [existing] = await pool.query(
      `SELECT * FROM contact_requests 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)`,
      [senderId, targetId, targetId, senderId]
    );

    if (existing.length > 0) {
      const reqRecord = existing[0];
      if (reqRecord.status === 'accepted') {
        return res.status(400).json({ error: 'You are already contacts with this user' });
      }
      if (reqRecord.status === 'pending') {
        if (reqRecord.sender_id === senderId) {
          return res.status(400).json({ error: 'Request already sent and is pending' });
        } else {
          // If the other person already sent a request, auto-accept it!
          await pool.query('UPDATE contact_requests SET status = "accepted" WHERE id = ?', [reqRecord.id]);
          return res.json({ success: true, status: 'accepted', message: 'Request accepted!' });
        }
      }
      // If rejected previously, re-open as pending
      await pool.query(
        'UPDATE contact_requests SET sender_id = ?, receiver_id = ?, status = "pending" WHERE id = ?',
        [senderId, targetId, reqRecord.id]
      );
      return res.json({ success: true, status: 'pending', message: 'Contact request sent' });
    }

    // Insert new request
    const [result] = await pool.query(
      'INSERT INTO contact_requests (sender_id, receiver_id, status) VALUES (?, ?, "pending")',
      [senderId, targetId]
    );

    // Emit socket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.emit('contact_request_received', {
        requestId: result.insertId,
        senderId,
        senderUsername: req.user.username,
        receiverId: targetId
      });
    }

    return res.status(201).json({
      success: true,
      status: 'pending',
      requestId: result.insertId,
      message: 'Contact request sent successfully'
    });
  } catch (err) {
    console.error('sendRequest error:', err);
    return res.status(500).json({ error: 'Failed to send contact request' });
  }
}

// Get pending incoming and outgoing requests
async function getRequests(req, res) {
  try {
    const currentUserId = req.user.id;
    const pool = getPool();

    // Incoming requests (people asking to connect with me)
    const [incoming] = await pool.query(
      `SELECT cr.id AS request_id, cr.sender_id, cr.created_at,
              u.username, u.avatar_url, u.status
       FROM contact_requests cr
       JOIN users u ON cr.sender_id = u.id
       WHERE cr.receiver_id = ? AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [currentUserId]
    );

    // Outgoing requests (requests I sent that are pending)
    const [outgoing] = await pool.query(
      `SELECT cr.id AS request_id, cr.receiver_id, cr.created_at,
              u.username, u.avatar_url, u.status
       FROM contact_requests cr
       JOIN users u ON cr.receiver_id = u.id
       WHERE cr.sender_id = ? AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [currentUserId]
    );

    return res.json({ incoming, outgoing });
  } catch (err) {
    console.error('getRequests error:', err);
    return res.status(500).json({ error: 'Failed to fetch contact requests' });
  }
}

// Respond to an incoming request (accept or reject)
async function respondRequest(req, res) {
  try {
    const currentUserId = req.user.id;
    const { requestId, action } = req.body; // action: 'accept' | 'reject'

    if (!requestId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Valid requestId and action (accept/reject) required' });
    }

    const pool = getPool();

    const [rows] = await pool.query(
      'SELECT * FROM contact_requests WHERE id = ? AND receiver_id = ? AND status = "pending"',
      [requestId, currentUserId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }

    const request = rows[0];
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    await pool.query('UPDATE contact_requests SET status = ? WHERE id = ?', [newStatus, requestId]);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('contact_request_updated', {
        requestId,
        senderId: request.sender_id,
        receiverId: currentUserId,
        status: newStatus
      });
    }

    return res.json({
      success: true,
      status: newStatus,
      message: `Request ${action}ed successfully`
    });
  } catch (err) {
    console.error('respondRequest error:', err);
    return res.status(500).json({ error: 'Failed to respond to request' });
  }
}

// Get all accepted contacts
async function getContacts(req, res) {
  try {
    const currentUserId = req.user.id;
    const pool = getPool();

    const [contacts] = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.about, u.status, u.created_at
       FROM users u
       WHERE u.id IN (
         SELECT receiver_id FROM contact_requests WHERE sender_id = ? AND status = 'accepted'
         UNION
         SELECT sender_id FROM contact_requests WHERE receiver_id = ? AND status = 'accepted'
       )
       ORDER BY u.username ASC`,
      [currentUserId, currentUserId]
    );

    return res.json({ contacts });
  } catch (err) {
    console.error('getContacts error:', err);
    return res.status(500).json({ error: 'Failed to fetch contacts' });
  }
}

module.exports = {
  searchUsers,
  getUserProfile,
  sendRequest,
  getRequests,
  respondRequest,
  getContacts
};

