const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
// Rate limiters commented out for development
// const { authLimiter, registerLimiter, checkLimiter, oauthLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  resendOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePhoneNumberSchema,
  updateNotificationPreferencesSchema,
  checkUsernameSchema,
  checkEmailSchema,
  loginHistorySchema,
} = require('../validators/schemas');

// Username/Email availability check (rate limiter removed for dev)
router.get('/check-username', validateRequest(checkUsernameSchema), authController.checkUsername);
router.get('/check-email', validateRequest(checkEmailSchema), authController.checkEmail);

// Public routes (rate limiters removed for dev)
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/verify-otp', validateRequest(verifyOTPSchema), authController.verifyOTP);
router.post('/resend-otp', validateRequest(resendOTPSchema), authController.resendOTP);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', validateRequest(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.get('/login-history', protect, validateRequest(loginHistorySchema), authController.getLoginHistory);
router.post('/fcm-token', protect, authController.updateFCMToken);
router.post('/phone-number', protect, validateRequest(updatePhoneNumberSchema), authController.updatePhoneNumber);
router.put('/notification-preferences', protect, validateRequest(updateNotificationPreferencesSchema), authController.updateNotificationPreferences);
router.post('/test-whatsapp', protect, authController.testWhatsAppNotification);

// OAuth routes - Google (rate limiter removed for dev)
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

// OAuth routes - GitHub (rate limiter removed for dev)
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

// ====================================
// DEVELOPMENT ONLY ROUTES (NO RATE LIMITING)
// ====================================
// Uncomment these if you need alternative endpoints for testing
// router.post('/dev/register', validateRequest(registerSchema), authController.register);
// router.post('/dev/login', validateRequest(loginSchema), authController.login);
// router.post('/dev/verify-otp', validateRequest(verifyOTPSchema), authController.verifyOTP);

module.exports = router;
