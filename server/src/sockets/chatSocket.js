const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

const onlineUsers = new Map(); // userId -> Set of socketIds
const roomMetaCache = new Map(); // roomId -> { id, name, type, members }
const userProfileCache = new Map(); // userId -> { id, username, full_name, avatar_url }

async function getRoomMeta(pool, roomId) {
  const rId = Number(roomId);
  if (roomMetaCache.has(rId)) {
    return roomMetaCache.get(rId);
  }

  const [roomRows] = await pool.query('SELECT id, name, type FROM rooms WHERE id = ?', [rId]);
  if (roomRows.length === 0) return null;

  const [memberRows] = await pool.query(
    `SELECT rm.user_id, u.username, u.full_name 
     FROM room_members rm 
     JOIN users u ON rm.user_id = u.id 
     WHERE rm.room_id = ?`,
    [rId]
  );

  const meta = {
    id: roomRows[0].id,
    name: roomRows[0].name,
    type: roomRows[0].type,
    members: memberRows
  };
  roomMetaCache.set(rId, meta);
  return meta;
}

async function getUserProfile(pool, userId, defaultUser) {
  const uId = Number(userId);
  if (userProfileCache.has(uId)) {
    return userProfileCache.get(uId);
  }

  try {
    const [rows] = await pool.query('SELECT id, username, full_name, avatar_url FROM users WHERE id = ?', [uId]);
    if (rows.length > 0) {
      userProfileCache.set(uId, rows[0]);
      return rows[0];
    }
  } catch (err) {
    console.warn('Error fetching user profile for cache:', err.message);
  }

  return {
    id: uId,
    username: defaultUser?.username || 'User',
    full_name: defaultUser?.full_name || defaultUser?.username || 'User',
    avatar_url: defaultUser?.avatar_url || null
  };
}

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

    // Send Message (Ultra-fast 0-overhead single query processing)
    socket.on('send_message', async ({ roomId, content, messageType, mediaUrl, tempId }, callback) => {
      const type = ['image', 'audio'].includes(messageType) ? messageType : 'text';
      const textContent = (content || (type === 'image' ? 'Photo' : type === 'audio' ? 'Voice note' : '')).trim();

      if (type === 'text' && !textContent) {
        if (callback) callback({ error: 'Message content cannot be empty' });
        return;
      }

      try {
        const pool = getPool();

        // 1. Get sender profile (In-memory cached)
        const senderProfile = await getUserProfile(pool, userId, socket.user);
        const senderName = senderProfile.username || username;
        const senderAvatar = senderProfile.avatar_url || null;

        // 2. Get room metadata (In-memory cached)
        const roomMeta = await getRoomMeta(pool, roomId);
        let receiverId = null;
        let receiverName = null;

        if (roomMeta) {
          if (roomMeta.type === 'direct') {
            const otherMember = roomMeta.members.find((m) => Number(m.user_id) !== Number(userId));
            if (otherMember) {
              receiverId = otherMember.user_id;
              receiverName = otherMember.username;
            }
          } else {
            receiverName = `#${roomMeta.name}`;
          }
        }

        // 3. Single INSERT query
        const [result] = await pool.query(
          'INSERT INTO messages (room_id, sender_id, sender_name, receiver_id, receiver_name, content, message_type, media_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [roomId, userId, senderName, receiverId, receiverName, textContent, type, mediaUrl || null]
        );

        const newMessage = {
          id: result.insertId,
          room_id: Number(roomId),
          sender_id: userId,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          receiver_id: receiverId,
          receiver_name: receiverName,
          content: textContent,
          message_type: type,
          media_url: mediaUrl || null,
          created_at: new Date().toISOString(),
          tempId: tempId || null
        };

        // Broadcast to everyone in the room immediately
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

    const activeCalls = new Map(); // key: "minId_maxId" -> { callerId, receiverId, callType, startTime, acceptedAt }

    async function logCall({ callerId, receiverId, callType, status, duration }) {
      try {
        const pool = getPool();
        const [result] = await pool.query(
          'INSERT INTO call_logs (caller_id, receiver_id, call_type, status, duration) VALUES (?, ?, ?, ?, ?)',
          [callerId, receiverId, callType, status, duration]
        );

        const [rows] = await pool.query(
          `SELECT c.id, c.caller_id, c.receiver_id, c.call_type, c.status, c.duration, c.created_at,
                  caller.username AS caller_username, caller.full_name AS caller_full_name, caller.avatar_url AS caller_avatar,
                  receiver.username AS receiver_username, receiver.full_name AS receiver_full_name, receiver.avatar_url AS receiver_avatar
           FROM call_logs c
           JOIN users caller ON c.caller_id = caller.id
           JOIN users receiver ON c.receiver_id = receiver.id
           WHERE c.id = ?`,
          [result.insertId]
        );

        if (rows.length > 0) {
          const loggedCall = rows[0];
          io.to(`user_${callerId}`).emit('call_logged', loggedCall);
          io.to(`user_${receiverId}`).emit('call_logged', loggedCall);
        }
      } catch (err) {
        console.error('Error logging call:', err.message || err);
      }
    }

    // Start Call (Caller -> Callee)
    socket.on('start_call', ({ targetUserId, callType, callerName, callerAvatar, signalData }) => {
      console.log(`📞 start_call: from ${userId} (${username}) to ${targetUserId} (${callType})`);
      
      const targetId = Number(targetUserId);
      const targetRoom = `user_${targetUserId}`;
      const socketsInRoom = io.sockets.adapter.rooms.get(targetRoom);
      const userSockets = onlineUsers.get(targetId) || onlineUsers.get(String(targetUserId));

      const isOnline = (socketsInRoom && socketsInRoom.size > 0) || (userSockets && userSockets.size > 0);

      const callKey = `${Math.min(userId, targetId)}_${Math.max(userId, targetId)}`;

      if (isOnline) {
        console.log(`🔔 Delivering incoming_call to target user ${targetUserId} (${callType})`);
        activeCalls.set(callKey, {
          callerId: userId,
          receiverId: targetId,
          callType: callType === 'video' ? 'video' : 'audio',
          startTime: Date.now(),
          acceptedAt: null
        });

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
        logCall({
          callerId: userId,
          receiverId: targetId,
          callType: callType === 'video' ? 'video' : 'audio',
          status: 'missed',
          duration: 0
        });
        socket.emit('call_user_offline', { targetUserId });
      }
    });

    // Accept Call (Callee -> Caller)
    socket.on('accept_call', ({ callerId, signalData }) => {
      console.log(`✅ Call accepted by ${userId} for caller ${callerId}`);
      const callerIdNum = Number(callerId);
      const callerSockets = onlineUsers.get(callerIdNum) || onlineUsers.get(String(callerId));

      const callKey = `${Math.min(userId, callerIdNum)}_${Math.max(userId, callerIdNum)}`;
      const call = activeCalls.get(callKey);
      if (call) {
        call.acceptedAt = Date.now();
      }

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
    socket.on('reject_call', async ({ callerId }) => {
      console.log(`❌ Call rejected by ${userId} for caller ${callerId}`);
      const callerIdNum = Number(callerId);
      const callerSockets = onlineUsers.get(callerIdNum) || onlineUsers.get(String(callerId));

      const callKey = `${Math.min(userId, callerIdNum)}_${Math.max(userId, callerIdNum)}`;
      const call = activeCalls.get(callKey);
      activeCalls.delete(callKey);

      await logCall({
        callerId: callerIdNum,
        receiverId: userId,
        callType: call ? call.callType : 'audio',
        status: 'rejected',
        duration: 0
      });

      const payload = { calleeId: userId };
      io.to(`user_${callerId}`).emit('call_rejected', payload);
      if (callerSockets) {
        callerSockets.forEach((sId) => {
          io.to(sId).emit('call_rejected', payload);
        });
      }
    });

    // End Call (Either party hangs up)
    socket.on('end_call', async ({ targetUserId }) => {
      console.log(`⏹️ Call ended by ${userId} for user ${targetUserId}`);
      const targetIdNum = Number(targetUserId);
      const targetSockets = onlineUsers.get(targetIdNum) || onlineUsers.get(String(targetUserId));

      const callKey = `${Math.min(userId, targetIdNum)}_${Math.max(userId, targetIdNum)}`;
      const call = activeCalls.get(callKey);
      if (call) {
        activeCalls.delete(callKey);
        const duration = call.acceptedAt ? Math.round((Date.now() - call.acceptedAt) / 1000) : 0;
        const status = call.acceptedAt ? 'completed' : 'missed';
        await logCall({
          callerId: call.callerId,
          receiverId: call.receiverId,
          callType: call.callType,
          status,
          duration
        });
      }

      const payload = { fromUserId: userId };
      io.to(`user_${targetUserId}`).emit('call_ended', payload);
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('call_ended', payload);
        });
      }
    });

    // WebRTC Signal relay (offer, answer, etc.)
    socket.on('webrtc_signal', ({ targetUserId, signalData }) => {
      const payload = { signalData, fromUserId: userId };
      io.to(`user_${targetUserId}`).emit('webrtc_signal', payload);
      const targetIdNum = Number(targetUserId);
      const targetSockets = onlineUsers.get(targetIdNum) || onlineUsers.get(String(targetUserId));
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('webrtc_signal', payload);
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
      // Check if user was in an active call
      for (const [callKey, call] of activeCalls.entries()) {
        if (call.callerId === userId || call.receiverId === userId) {
          activeCalls.delete(callKey);
          const duration = call.acceptedAt ? Math.round((Date.now() - call.acceptedAt) / 1000) : 0;
          const status = call.acceptedAt ? 'completed' : 'missed';
          await logCall({
            callerId: call.callerId,
            receiverId: call.receiverId,
            callType: call.callType,
            status,
            duration
          });
          const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
          io.to(`user_${otherUserId}`).emit('call_ended', { fromUserId: userId });
        }
      }

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
