const authService = require('../services/authService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse } = require('../utils/response');
const IPUtils = require('../utils/ipUtils');
const { HttpStatus } = require('../constants/httpStatus');

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
  }  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
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

const checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Email is required',
    });
  }  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;  const ip = IPUtils.extractIP(req);  const userAgent = req.headers['user-agent'];

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

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let accessToken = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    accessToken = req.headers.authorization.split(' ')[1];
  }

  await authService.logout(req.user.id, refreshToken, accessToken);

  successResponse(res, null, 'Logout successful');
});

const getMe = asyncHandler(async (req, res) => {
  successResponse(res, req.user, 'User retrieved successfully');
});

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

const googleCallback = asyncHandler(async (req, res) => {  const { user, accessToken, refreshToken } = await authService.oauthLogin(req.user, 'google');  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
});

const githubCallback = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.oauthLogin(req.user, 'github');  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
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
  }  const whatsappService = require('../services/whatsappService');
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

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(HttpStatus.BAD_REQUEST.code).json({
      success: false,
      message: 'Email and OTP are required',
    });
  }  const ip = IPUtils.extractIP(req);
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

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await authService.forgotPassword(email);

  res.status(HttpStatus.OK.code).json({
    success: true,
    message: result.message,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const result = await authService.resetPassword(token, password);

  res.status(HttpStatus.OK.code).json({
    success: true,
    message: result.message,
  });
});

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
  forgotPassword,
  resetPassword,
  getLoginHistory,
};
