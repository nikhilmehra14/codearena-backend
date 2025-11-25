const authService = require('../services/authService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse } = require('../utils/response');
const IPUtils = require('../utils/ipUtils');
const { HttpStatus } = require('../constants/httpStatus');

// @desc    Check username availability
// @route   GET /api/v1/auth/check-username
// @access  Public
const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.query;

  if (!username || username.length < 3) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Username must be at least 3 characters',
    });
  }

  if (username.length > 20) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Username must be less than 20 characters',
    });
  }

  // Validate username format (alphanumeric + underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Username can only contain letters, numbers, and underscores',
    });
  }

  const available = await authService.checkUsernameAvailability(username);

  res.status(HttpStatus.OK.code).json({
    success: true,
    data: {
      username,
      available,
      message: available ? 'Username is available' : 'Username is already taken',
    },
  });
});

// @desc    Check email availability
// @route   GET /api/v1/auth/check-email
// @access  Public
const checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Email is required',
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Invalid email format',
    });
  }

  const available = await authService.checkEmailAvailability(email);

  res.status(HttpStatus.OK.code).json({
    success: true,
    data: {
      email,
      available,
      message: available ? 'Email is available' : 'Email is already registered',
    },
  });
});

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(HttpStatus.CREATED.code).json({
    success: true,
    message: result.message,
    data: {
      user: result.user,
      requiresVerification: result.requiresVerification,
    },
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Extract IP address
  const ip = IPUtils.extractIP(req);

  // Extract user agent
  const userAgent = req.headers['user-agent'];

  const { user, accessToken, refreshToken } = await authService.login(email, password, ip, userAgent);

  res.status(HttpStatus.OK.code).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Refresh token is required',
    });
  }

  const { accessToken } = await authService.refreshAccessToken(refreshToken);

  successResponse(res, { accessToken }, 'Token refreshed successfully');
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  await authService.logout(req.user.id, refreshToken);

  successResponse(res, null, 'Logout successful');
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  successResponse(res, req.user, 'User retrieved successfully');
});

// @desc    Update FCM token
// @route   POST /api/v1/auth/fcm-token
// @access  Private
const updateFCMToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'FCM token is required',
    });
  }

  const user = await authService.updateFCMToken(req.user.id, fcmToken);

  successResponse(res, user, 'FCM token updated successfully');
});

// @desc    Google OAuth callback
// @route   GET /api/v1/auth/google/callback
// @access  Public
const googleCallback = asyncHandler(async (req, res) => {
  // This will be handled by passport middleware
  const { user, accessToken, refreshToken } = await authService.oauthLogin(req.user, 'google');

  // Redirect to frontend with tokens
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
});

// @desc    GitHub OAuth callback
// @route   GET /api/v1/auth/github/callback
// @access  Public
const githubCallback = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.oauthLogin(req.user, 'github');

  // Redirect to frontend with tokens
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
});

module.exports = {
  checkUsername,
  checkEmail,
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateFCMToken,
  googleCallback,
  githubCallback,
};

// Update phone number
const updatePhoneNumber = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  const userId = req.user.id;

  if (!phoneNumber) {
    throw new BadRequestError('Phone number is required');
  }

  // Format and validate phone number
  const whatsappService = require('../services/whatsappService');
  const formattedPhone = whatsappService.formatPhoneNumber(phoneNumber);

  if (!whatsappService.isValidPhoneNumber(formattedPhone)) {
    throw new BadRequestError('Invalid phone number format. Use E.164 format (e.g., +919876543210)');
  }

  const updatedUser = await authService.updatePhoneNumber(userId, formattedPhone);

  res.status(HttpStatus.OK.code).json({
    success: true,
    message: 'Phone number updated successfully',
    data: updatedUser,
  });
});

// Update notification preferences
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const { notifyViaPush, notifyViaWhatsApp, notifyViaEmail } = req.body;
  const userId = req.user.id;

  const updatedUser = await authService.updateNotificationPreferences(userId, {
    notifyViaPush,
    notifyViaWhatsApp,
    notifyViaEmail,
  });

  res.status(HttpStatus.OK.code).json({
    success: true,
    message: 'Notification preferences updated successfully',
    data: updatedUser,
  });
});

// @desc    Test WhatsApp notification
const testWhatsAppNotification = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const whatsappService = require('../services/whatsappService');
  const { prisma } = require('../config/database');

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user.phoneNumber) {
    throw new BadRequestError('Phone number not set. Please update your phone number first.');
  }

  if (!whatsappService.isConfigured()) {
    throw new BadRequestError('WhatsApp service is not configured on the server');
  }

  const result = await whatsappService.sendTestMessage(user.phoneNumber);

  res.status(HttpStatus.OK.code).json({
    success: true,
    message: 'Test WhatsApp message sent successfully',
    data: result,
  });
});

// @desc    Verify OTP
// @route   POST /api/v1/auth/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Email and OTP are required',
    });
  }

  // Extract IP address and user agent for activity tracking
  const ip = IPUtils.extractIP(req);
  const userAgent = req.headers['user-agent'];

  const result = await authService.verifyOTP(email, otp, ip, userAgent);

  res.status(HttpStatus.OK.code).json({
    success: true,
    message: result.message,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

// @desc    Resend OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Email is required',
    });
  }

  const result = await authService.resendOTP(email);

  res.status(HttpStatus.OK.code).json({
    success: true,
    message: result.message,
  });
});

// @desc    Get login history
// @route   GET /api/v1/auth/login-history
// @access  Private
const getLoginHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 10;

  const activities = await authService.getLoginHistory(userId, limit);

  res.status(HttpStatus.OK.code).json({
    success: true,
    message: 'Login history retrieved successfully',
    data: activities,
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateFCMToken,
  checkUsername,
  checkEmail,
  googleCallback,
  githubCallback,
  updatePhoneNumber,
  updateNotificationPreferences,
  testWhatsAppNotification,
  verifyOTP,
  resendOTP,
  getLoginHistory,
};
