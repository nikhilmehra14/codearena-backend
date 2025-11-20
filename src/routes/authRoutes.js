const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, registerLimiter, checkLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../validators/validators');

// Username/Email availability check (rate limited separately)
router.get('/check-username', checkLimiter, authController.checkUsername);
router.get('/check-email', checkLimiter, authController.checkEmail);

// Public routes
router.post('/register', registerLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/verify-otp', authLimiter, authController.verifyOTP);
router.post('/resend-otp', authLimiter, authController.resendOTP);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.get('/login-history', protect, authController.getLoginHistory);
router.post('/fcm-token', protect, authController.updateFCMToken);
router.post('/phone-number', protect, authController.updatePhoneNumber);
router.put('/notification-preferences', protect, authController.updateNotificationPreferences);
router.post('/test-whatsapp', protect, authController.testWhatsAppNotification);

// OAuth routes (will be configured with Passport in server.js)
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get('/google/callback', passport.authenticate('google'), authController.googleCallback);
// router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
// router.get('/github/callback', passport.authenticate('github'), authController.githubCallback);

module.exports = router;
