const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validateUpdateProfile, validateLinkPlatform } = require('../validators/validators');

// All routes are protected
router.use(protect);

router.get('/profile', userController.getUserProfile);
router.put('/profile', validateUpdateProfile, userController.updateUserProfile);
router.get('/dashboard', userController.getUserDashboard);

router.post('/link-platform', validateLinkPlatform, userController.linkPlatform);
router.delete('/unlink-platform/:platform', userController.unlinkPlatform);
router.get('/linked-platforms', userController.getLinkedPlatforms);
router.put('/platform/:platform', userController.updatePlatformUsername);

router.delete('/account', userController.deleteAccount);

module.exports = router;
