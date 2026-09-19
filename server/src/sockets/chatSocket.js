const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

const onlineUsers = new Map(); // userId -> Set of socketIds

function setupChatSocket(io) {
  // Socket Auth Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_chatapp_2026', (err, user) => {
      if (err) {
        return next(new Error('Invalid token'));
      }
      socket.user = user;
      next();
    });
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    const username = socket.user.username;

    // Join personal notification & calling room (handles multiple tabs automatically)
    socket.join(`user_${userId}`);

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    try {
      const pool = getPool();
      await pool.query('UPDATE users SET status = "online" WHERE id = ?', [userId]);
      io.emit('user_status_change', { userId, status: 'online' });
    } catch (err) {
      console.error('Error updating user online status:', err.message);
    }

    // Send currently online user IDs
    socket.emit('online_users_list', Array.from(onlineUsers.keys()));

    // Join room / channel
    socket.on('join_room', (roomId) => {
      socket.join(`room_${roomId}`);
    });

    // Leave room / channel
    socket.on('leave_room', (roomId) => {
      socket.leave(`room_${roomId}`);
    });

    // Typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(`room_${roomId}`).emit('user_typing', {
        roomId,
        userId,
        username,
        isTyping
      });
    });

    // Send Message (Supports Text, Photo, and Voice Note Audio)
    socket.on('send_message', async ({ roomId, content, messageType, mediaUrl }, callback) => {
      const type = ['image', 'audio'].includes(messageType) ? messageType : 'text';
      const textContent = (content || (type === 'image' ? 'Photo' : type === 'audio' ? 'Voice note' : '')).trim();

      if (type === 'text' && !textContent) {
        if (callback) callback({ error: 'Message content cannot be empty' });
        return;
      }

      try {
        const pool = getPool();
        const [result] = await pool.query(
          'INSERT INTO messages (room_id, sender_id, content, message_type, media_url) VALUES (?, ?, ?, ?, ?)',
          [roomId, userId, textContent, type, mediaUrl || null]
        );

        const [rows] = await pool.query(
          `SELECT m.id, m.room_id, m.sender_id, m.content, m.message_type, m.media_url, m.created_at,
                  u.username AS sender_name, u.avatar_url AS sender_avatar
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.id = ?`,
          [result.insertId]
        );

        const newMessage = rows[0];

        // Broadcast to everyone in the room
        io.to(`room_${roomId}`).emit('new_message', newMessage);

        if (callback) callback({ success: true, message: newMessage });
      } catch (err) {
        console.error('Socket send_message error:', err);
        if (callback) callback({ error: 'Failed to send message: ' + err.message });
      }
    });

    // ==========================================
    // AUDIO & VIDEO CALLING SIGNALING (WebRTC)
    // ==========================================

    // Start Call (Caller -> Callee)
    socket.on('start_call', ({ targetUserId, callType, callerName, callerAvatar, signalData }) => {
      console.log(`📞 start_call: from ${userId} (${username}) to ${targetUserId} (${callType})`);
      
      const targetId = Number(targetUserId);
      const targetRoom = `user_${targetUserId}`;
      const socketsInRoom = io.sockets.adapter.rooms.get(targetRoom);
      const userSockets = onlineUsers.get(targetId) || onlineUsers.get(String(targetUserId));

      const isOnline = (socketsInRoom && socketsInRoom.size > 0) || (userSockets && userSockets.size > 0);

      if (isOnline) {
        console.log(`🔔 Delivering incoming_call to target user ${targetUserId} (${callType})`);
        const payload = {
          callerId: userId,
          callerName: callerName || username,
          callerAvatar: callerAvatar || socket.user.avatar_url,
          callType, // 'audio' | 'video'
          signalData
        };

        // Emit to personal room
        io.to(targetRoom).emit('incoming_call', payload);

        // Also emit directly to individual sockets for guaranteed delivery
        if (userSockets) {
          userSockets.forEach((sId) => {
            io.to(sId).emit('incoming_call', payload);
          });
        }
      } else {
        console.log(`⚠️ Target user ${targetUserId} is offline`);
        socket.emit('call_user_offline', { targetUserId });
      }
    });

    // Accept Call (Callee -> Caller)
    socket.on('accept_call', ({ callerId, signalData }) => {
      console.log(`✅ Call accepted by ${userId} for caller ${callerId}`);
      const callerIdNum = Number(callerId);
      const callerSockets = onlineUsers.get(callerIdNum) || onlineUsers.get(String(callerId));

      const payload = {
        calleeId: userId,
        signalData
      };

      io.to(`user_${callerId}`).emit('call_accepted', payload);
      if (callerSockets) {
        callerSockets.forEach((sId) => {
          io.to(sId).emit('call_accepted', payload);
        });
      }
    });

    // Reject Call (Callee -> Caller)
    socket.on('reject_call', ({ callerId }) => {
      console.log(`❌ Call rejected by ${userId} for caller ${callerId}`);
      const callerIdNum = Number(callerId);
      const callerSockets = onlineUsers.get(callerIdNum) || onlineUsers.get(String(callerId));

      const payload = { calleeId: userId };
      io.to(`user_${callerId}`).emit('call_rejected', payload);
      if (callerSockets) {
        callerSockets.forEach((sId) => {
          io.to(sId).emit('call_rejected', payload);
        });
      }
    });

    // End Call (Either party hangs up)
    socket.on('end_call', ({ targetUserId }) => {
      console.log(`⏹️ Call ended by ${userId} for user ${targetUserId}`);
      const targetIdNum = Number(targetUserId);
      const targetSockets = onlineUsers.get(targetIdNum) || onlineUsers.get(String(targetUserId));

      const payload = { fromUserId: userId };
      io.to(`user_${targetUserId}`).emit('call_ended', payload);
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('call_ended', payload);
        });
      }
    });

    // ICE Candidate relay
    socket.on('ice_candidate', ({ targetUserId, candidate }) => {
      const payload = { candidate, fromUserId: userId };
      io.to(`user_${targetUserId}`).emit('ice_candidate', payload);
      const targetIdNum = Number(targetUserId);
      const targetSockets = onlineUsers.get(targetIdNum) || onlineUsers.get(String(targetUserId));
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('ice_candidate', payload);
        });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);
          try {
            const pool = getPool();
            await pool.query('UPDATE users SET status = "offline" WHERE id = ?', [userId]);
            io.emit('user_status_change', { userId, status: 'offline' });
          } catch (err) {
            console.error('Error updating user offline status:', err.message);
          }
        }
      }
    });
  });
}

module.exports = { setupChatSocket };
