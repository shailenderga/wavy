const express = require('express');
const router = express.Router();
const { getCalls, deleteCall, clearCalls } = require('../controllers/callController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', getCalls);
router.delete('/:id', deleteCall);
router.delete('/', clearCalls);

module.exports = router;
