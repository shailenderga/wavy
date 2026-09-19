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
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const pool = getPool();
    // Check if user exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username or Email is already taken' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const avatar_url = getRandomAvatar(username);

    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, avatar_url, status) VALUES (?, ?, ?, ?, "online")',
      [username, email, password_hash, avatar_url]
    );

    const user = {
      id: result.insertId,
      username,
      email,
      avatar_url,
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
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [loginId, loginId]
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
      email: user.email,
      avatar_url: user.avatar_url,
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
      'SELECT id, username, email, avatar_url, about, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: users[0] });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getAllUsers(req, res) {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, username, email, avatar_url, about, status, created_at FROM users WHERE id != ? ORDER BY username ASC',
      [req.user.id]
    );

    return res.json({ users });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { username, email, avatar_url, about } = req.body;
    const pool = getPool();

    // Check if username is already taken by another user
    if (username) {
      const trimmedName = username.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Username cannot be empty' });
      }
      const [existingUser] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [trimmedName, userId]
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Username is already taken by another user' });
      }
    }

    // Check if email is already taken by another user
    if (email) {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }
      const [existingEmail] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [trimmedEmail, userId]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: 'Email is already taken by another user' });
      }
    }

    // Fetch current user
    const [currentRows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (currentRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const current = currentRows[0];

    const newUsername = username !== undefined ? username.trim() : current.username;
    const newEmail = email !== undefined ? email.trim() : current.email;
    const newAvatar = avatar_url !== undefined ? avatar_url : current.avatar_url;
    const newAbout = about !== undefined ? about.trim() : (current.about || 'Hey there! I am using WhatsApp.');

    await pool.query(
      'UPDATE users SET username = ?, email = ?, avatar_url = ?, about = ? WHERE id = ?',
      [newUsername, newEmail, newAvatar, newAbout, userId]
    );

    const [updatedRows] = await pool.query(
      'SELECT id, username, email, avatar_url, about, status, created_at FROM users WHERE id = ?',
      [userId]
    );
    const updatedUser = updatedRows[0];

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

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
  updateProfile,
  forgotPassword,
  deleteAccount
};
