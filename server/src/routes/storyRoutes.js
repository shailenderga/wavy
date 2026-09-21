const express = require('express');
const router = express.Router();
const {
  createStory,
  getStories,
  recordStoryView,
  getStoryViewers
} = require('../controllers/storyController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', createStory);
router.get('/', getStories);
router.post('/:id/view', recordStoryView);
router.get('/:id/viewers', getStoryViewers);

module.exports = router;
