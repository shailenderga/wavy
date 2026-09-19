const express = require('express');
const router = express.Router();
const { createStory, getStories } = require('../controllers/storyController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', createStory);
router.get('/', getStories);

module.exports = router;
