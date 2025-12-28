const userService = require('../services/userService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse } = require('../utils/response');
const { HttpStatus } = require('../constants/httpStatus');

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserProfile(req.user.id);
  successResponse(res, user, 'User profile retrieved successfully');
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUserProfile(req.user.id, req.body);
  successResponse(res, user, 'User profile updated successfully');
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new BadRequestError('Please upload a file');
  }

  const avatarUrl = req.file.path;

  const user = await userService.updateUserProfile(req.user.id, {
    avatar: avatarUrl,
  });

  successResponse(res, { avatar: avatarUrl }, 'Avatar uploaded successfully');
});

const linkPlatform = asyncHandler(async (req, res) => {
  const { platform, platformUsername } = req.body;

  const linkedPlatform = await userService.linkPlatform(req.user.id, platform, platformUsername);

  res.status(HttpStatus.CREATED.code).json({
    success: true,
    message: 'Platform linked successfully',
    data: linkedPlatform,
  });
});

const unlinkPlatform = asyncHandler(async (req, res) => {
  await userService.unlinkPlatform(req.user.id, req.params.platform);
  successResponse(res, null, 'Platform unlinked successfully');
});

const getLinkedPlatforms = asyncHandler(async (req, res) => {
  const platforms = await userService.getLinkedPlatforms(req.user.id);
  successResponse(res, platforms, 'Linked platforms retrieved successfully');
});

const updatePlatformUsername = asyncHandler(async (req, res) => {
  const { platformUsername } = req.body;

  const linkedPlatform = await userService.updatePlatformUsername(
    req.user.id,
    req.params.platform,
    platformUsername
  );

  successResponse(res, linkedPlatform, 'Platform username updated successfully');
});

const deleteAccount = asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user.id);
  successResponse(res, null, 'Account deleted successfully');
});

const getUserDashboard = asyncHandler(async (req, res) => {
  const dashboard = await userService.getUserDashboard(req.user.id);
  successResponse(res, dashboard, 'Dashboard retrieved successfully');
});

const getActiveSessions = asyncHandler(async (req, res) => {
  const sessions = await userService.getActiveSessions(req.user.id);
  successResponse(res, sessions, 'Active sessions retrieved successfully');
});

const logoutSession = asyncHandler(async (req, res) => {
  // Extract access token from Authorization header
  let accessToken = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    accessToken = req.headers.authorization.split(' ')[1];
  }

  await userService.logoutSession(req.user.id, req.params.sessionId, accessToken);
  successResponse(res, null, 'Session logged out successfully');
});

const logoutAllSessions = asyncHandler(async (req, res) => {
  // Extract access token from Authorization header
  let accessToken = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    accessToken = req.headers.authorization.split(' ')[1];
  }

  // TODO: Get current token ID from req.user or JWT
  await userService.logoutAllSessions(req.user.id, null, accessToken);
  successResponse(res, null, 'All sessions logged out successfully');
});

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  linkPlatform,
  unlinkPlatform,
  getLinkedPlatforms,
  updatePlatformUsername,
  deleteAccount,
  getUserDashboard,
  getActiveSessions,
  logoutSession,
  logoutAllSessions,
};
