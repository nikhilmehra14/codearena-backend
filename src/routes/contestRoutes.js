const express = require('express');
const router = express.Router();
const contestController = require('../controllers/contestController');
const { optionalAuth, protect, requireAdmin } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  getContestsSchema,
  getContestByIdSchema,
  getContestsByPlatformSchema,
} = require('../validators/schemas');

// Public routes (with optional auth)
router.get('/', optionalAuth, validateRequest(getContestsSchema), contestController.getContests);
router.get('/upcoming', optionalAuth, contestController.getUpcomingContests);
router.get('/platform/:platform', optionalAuth, validateRequest(getContestsByPlatformSchema), contestController.getContestsByPlatform);
router.get('/:id', optionalAuth, validateRequest(getContestByIdSchema), contestController.getContestById);

// Admin/System routes (protected)
router.post('/sync', protect, requireAdmin, contestController.syncContests);

module.exports = router;
