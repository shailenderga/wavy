const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getAllUsers,
  updateProfile,
  forgotPassword,
  deleteAccount
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticateToken, getMe);
router.get('/users', authenticateToken, getAllUsers);
router.put('/profile', authenticateToken, updateProfile);
router.delete('/account', authenticateToken, deleteAccount);

module.exports = router;
