const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  updateProfileSchema,
  linkPlatformSchema,
  updatePlatformUsernameSchema,
} = require('../validators/schemas');

const { uploadAvatar } = require('../middleware/upload');

// All routes are protected
router.use(protect);

router.get('/profile', userController.getUserProfile);
router.put('/profile', validateRequest(updateProfileSchema), userController.updateUserProfile);
router.post('/avatar', uploadAvatar, userController.uploadAvatar);
router.get('/dashboard', userController.getUserDashboard);

router.post('/link-platform', validateRequest(linkPlatformSchema), userController.linkPlatform);
router.delete('/unlink-platform/:platform', userController.unlinkPlatform);
router.get('/linked-platforms', userController.getLinkedPlatforms);
router.put('/platform/:platform', validateRequest(updatePlatformUsernameSchema), userController.updatePlatformUsername);

// Session management routes
router.get('/sessions', userController.getActiveSessions);
router.delete('/sessions/:sessionId', userController.logoutSession);
router.delete('/sessions', userController.logoutAllSessions);

router.delete('/account', userController.deleteAccount);

module.exports = router;
