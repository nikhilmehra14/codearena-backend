const express = require('express');
const router = express.Router();
const contestController = require('../controllers/contestController');
const { optionalAuth } = require('../middleware/auth');
const { validateContestQuery, validateUUID } = require('../validators/validators');

// Public routes (with optional auth)
router.get('/', optionalAuth, validateContestQuery, contestController.getContests);
router.get('/upcoming', optionalAuth, contestController.getUpcomingContests);
router.get('/platform/:platform', optionalAuth, contestController.getContestsByPlatform);
router.get('/:id', optionalAuth, validateUUID, contestController.getContestById);

// Admin/System routes (should be protected in production)
router.post('/sync', contestController.syncContests);

module.exports = router;
