const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, registerLimiter, checkLimiter, oauthLimiter } = require('../middleware/rateLimiter');
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

// Username/Email availability check (rate limited separately)
// router.get('/check-username', checkLimiter, validateRequest(checkUsernameSchema), authController.checkUsername);
// router.get('/check-email', checkLimiter, validateRequest(checkEmailSchema), authController.checkEmail);
router.get('/check-username', validateRequest(checkUsernameSchema), authController.checkUsername);
router.get('/check-email',  validateRequest(checkEmailSchema), authController.checkEmail);


// Public routes
router.post('/register', registerLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/verify-otp', authLimiter, validateRequest(verifyOTPSchema), authController.verifyOTP);
router.post('/resend-otp', authLimiter, validateRequest(resendOTPSchema), authController.resendOTP);
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.get('/login-history', protect, validateRequest(loginHistorySchema), authController.getLoginHistory);
router.post('/fcm-token', protect, authController.updateFCMToken);
router.post('/phone-number', protect, validateRequest(updatePhoneNumberSchema), authController.updatePhoneNumber);
router.put('/notification-preferences', protect, validateRequest(updateNotificationPreferencesSchema), authController.updateNotificationPreferences);
router.post('/test-whatsapp', protect, authController.testWhatsAppNotification);

// OAuth routes - Google (with rate limiting)
router.get(
  '/google',
  oauthLimiter,
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

// OAuth routes - GitHub (with rate limiting)
router.get(
  '/github',
  oauthLimiter,
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
