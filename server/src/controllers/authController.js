const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_chatapp_2026';

// Random avatar helper
const getRandomAvatar = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
};

async function register(req, res) {
  try {
    const { username, email, password, full_name, avatar_url, about } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    const pool = getPool();
    // 1. Strict unique username check (case-insensitive)
    const [existingUsername] = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
      [trimmedUsername]
    );

    if (existingUsername.length > 0) {
      return res.status(400).json({ error: 'This username is already taken. Please choose another username.' });
    }

    // 2. Strict unique email check (case-insensitive)
    const [existingEmail] = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?)',
      [trimmedEmail]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'This email is already registered. Please sign in or use another email.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userAvatar = avatar_url || getRandomAvatar(trimmedUsername);
    const userFullName = full_name ? full_name.trim() : trimmedUsername;
    const userAbout = about ? about.trim() : 'Hey there! I am using Wavy.';

    const [result] = await pool.query(
      'INSERT INTO users (username, full_name, email, password_hash, avatar_url, about, status) VALUES (?, ?, ?, ?, ?, ?, "online")',
      [trimmedUsername, userFullName, trimmedEmail, password_hash, userAvatar, userAbout]
    );

    const user = {
      id: result.insertId,
      username: trimmedUsername,
      full_name: userFullName,
      email: trimmedEmail,
      avatar_url: userAvatar,
      about: userAbout,
      status: 'online'
    };

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to register user: ' + err.message });
  }
}

async function login(req, res) {
  try {
    const { loginId, password } = req.body; // username or email
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const pool = getPool();
    const [users] = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [loginId.trim(), loginId.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set online
    await pool.query('UPDATE users SET status = "online" WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userSafe = {
      id: user.id,
      username: user.username,
      full_name: user.full_name || user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      about: user.about || 'Hey there! I am using Wavy.',
      status: 'online'
    };

    return res.json({ user: userSafe, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
}

async function getMe(req, res) {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, username, full_name, email, avatar_url, about, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = users[0];
    return res.json({
      user: {
        ...u,
        full_name: u.full_name || u.username
      }
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getAllUsers(req, res) {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, username, full_name, email, avatar_url, about, status, created_at FROM users WHERE id != ? ORDER BY username ASC',
      [req.user.id]
    );

    return res.json({
      users: users.map((u) => ({
        ...u,
        full_name: u.full_name || u.username
      }))
    });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { username, full_name, email, avatar_url, about } = req.body;
    const pool = getPool();

    // Fetch current user first
    const [currentRows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (currentRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const current = currentRows[0];

    // Check if username is being changed and if it is already taken by another user
    if (username && username.trim().toLowerCase() !== (current.username || '').toLowerCase()) {
      const trimmedName = username.trim();
      if (!trimmedName || trimmedName.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' });
      }
      const [existingUser] = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?',
        [trimmedName, userId]
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'This username is already taken by another user. Please choose a unique username.' });
      }
    }

    // Check if email is being changed and if it is already taken by another user
    if (email && email.trim().toLowerCase() !== (current.email || '').toLowerCase()) {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }
      const [existingEmail] = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?',
        [trimmedEmail, userId]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: 'Email is already taken by another user' });
      }
    }

    const newUsername = username !== undefined ? username.trim() : current.username;
    const newFullName = full_name !== undefined ? full_name.trim() : (current.full_name || current.username);
    const newEmail = email !== undefined ? email.trim() : current.email;
    const newAvatar = avatar_url !== undefined ? avatar_url : current.avatar_url;
    const newAbout = about !== undefined ? about.trim() : (current.about || 'Hey there! I am using Wavy.');

    await pool.query(
      'UPDATE users SET username = ?, full_name = ?, email = ?, avatar_url = ?, about = ? WHERE id = ?',
      [newUsername, newFullName, newEmail, newAvatar, newAbout, userId]
    );

    const [updatedRows] = await pool.query(
      'SELECT id, username, full_name, email, avatar_url, about, status, created_at FROM users WHERE id = ?',
      [userId]
    );
    const updatedUser = {
      ...updatedRows[0],
      full_name: updatedRows[0].full_name || updatedRows[0].username
    };

    // Issue updated token
    const token = jwt.sign(
      { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Broadcast profile update via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('user_profile_updated', {
        userId: updatedUser.id,
        username: updatedUser.username,
        full_name: updatedUser.full_name,
        avatar_url: updatedUser.avatar_url,
        about: updatedUser.about
      });
    }

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      token
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
}

async function forgotPassword(req, res) {
  try {
    const { loginId, newPassword } = req.body;
    if (!loginId || !newPassword) {
      return res.status(400).json({ error: 'Username/Email and new password are required' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long' });
    }

    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
      [loginId.trim(), loginId.trim()]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'No user found with that username or email' });
    }

    const targetUser = users[0];
    const password_hash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, targetUser.id]);

    return res.json({
      success: true,
      message: `Password reset successfully for ${targetUser.username}. You can now sign in with your new password.`
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
}

async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;
    const pool = getPool();

    // Delete user (Foreign key cascading deletes messages, rooms, contact_requests, stories)
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    const io = req.app.get('io');
    if (io) {
      io.emit('user_status_change', { userId, status: 'offline' });
      io.emit('contact_request_updated', { userId, status: 'deleted' });
    }

    return res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (err) {
    console.error('deleteAccount error:', err);
    return res.status(500).json({ error: 'Failed to delete account: ' + err.message });
  }
}

async function checkUsername(req, res) {
  try {
    const { username } = req.query;
    if (!username || !username.trim()) {
      return res.json({ available: false, message: 'Username cannot be empty' });
    }

    const trimmed = username.trim();
    if (trimmed.length < 3) {
      return res.json({ available: false, message: 'Username must be at least 3 characters long' });
    }

    const validRegex = /^[a-zA-Z0-9_.]+$/;
    if (!validRegex.test(trimmed)) {
      return res.json({ available: false, message: 'Only letters, numbers, dots, and underscores are allowed' });
    }

    const pool = getPool();
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
      [trimmed]
    );

    if (existing.length > 0) {
      return res.json({ available: false, message: 'Username is already taken' });
    }

    return res.json({ available: true, message: 'Username is available!' });
  } catch (err) {
    console.error('checkUsername error:', err);
    return res.status(500).json({ error: 'Failed to check username: ' + err.message });
  }
}

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
  updateProfile,
  forgotPassword,
  deleteAccount,
  checkUsername
};
