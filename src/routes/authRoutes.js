const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
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

// OAuth routes - Google
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: true,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`,
    session: true,
  }),
  authController.googleCallback
);

// OAuth routes - GitHub
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: true,
  })
);

router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`,
    session: true,
  }),
  authController.githubCallback
);

module.exports = router;
