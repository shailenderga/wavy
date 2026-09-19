const express = require('express');
const router = express.Router();
const {
  searchUsers,
  getUserProfile,
  sendRequest,
  getRequests,
  respondRequest,
  getContacts
} = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/search', searchUsers);
router.get('/user/:userId', getUserProfile);
router.post('/request', sendRequest);
router.get('/requests', getRequests);
router.post('/respond', respondRequest);
router.get('/', getContacts);

module.exports = router;

