const { getPool } = require('../config/db');

async function getCalls(req, res) {
  try {
    const userId = Number(req.user.id);
    const pool = getPool();

    const [calls] = await pool.query(
      `SELECT c.id, c.caller_id, c.receiver_id, c.call_type, c.status, c.duration, c.created_at,
              caller.username AS caller_username, caller.full_name AS caller_full_name, caller.avatar_url AS caller_avatar,
              receiver.username AS receiver_username, receiver.full_name AS receiver_full_name, receiver.avatar_url AS receiver_avatar
       FROM call_logs c
       JOIN users caller ON c.caller_id = caller.id
       JOIN users receiver ON c.receiver_id = receiver.id
       WHERE c.caller_id = ? OR c.receiver_id = ?
       ORDER BY c.created_at DESC
       LIMIT 100`,
      [userId, userId]
    );

    return res.json({ calls });
  } catch (err) {
    console.error('getCalls error:', err);
    return res.status(500).json({ error: 'Failed to fetch call logs: ' + err.message });
  }
}

async function deleteCall(req, res) {
  try {
    const callId = Number(req.params.id);
    const userId = Number(req.user.id);
    const pool = getPool();

    await pool.query(
      'DELETE FROM call_logs WHERE id = ? AND (caller_id = ? OR receiver_id = ?)',
      [callId, userId, userId]
    );

    return res.json({ success: true, message: 'Call log deleted' });
  } catch (err) {
    console.error('deleteCall error:', err);
    return res.status(500).json({ error: 'Failed to delete call log: ' + err.message });
  }
}

async function clearCalls(req, res) {
  try {
    const userId = Number(req.user.id);
    const pool = getPool();

    await pool.query(
      'DELETE FROM call_logs WHERE caller_id = ? OR receiver_id = ?',
      [userId, userId]
    );

    return res.json({ success: true, message: 'Call history cleared' });
  } catch (err) {
    console.error('clearCalls error:', err);
    return res.status(500).json({ error: 'Failed to clear call history: ' + err.message });
  }
}

module.exports = {
  getCalls,
  deleteCall,
  clearCalls
};
