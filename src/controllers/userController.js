const userService = require('../services/userService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse } = require('../utils/response');
const { HttpStatus } = require('../constants/httpStatus');

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserProfile(req.user.id);
  successResponse(res, user, 'User profile retrieved successfully');
});

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUserProfile(req.user.id, req.body);
  successResponse(res, user, 'User profile updated successfully');
});

// @desc    Link platform account
// @route   POST /api/v1/users/link-platform
// @access  Private
const linkPlatform = asyncHandler(async (req, res) => {
  const { platform, platformUsername } = req.body;

  const linkedPlatform = await userService.linkPlatform(req.user.id, platform, platformUsername);

  res.status(HttpStatus.CREATED.code).json({
    success: true,
    message: 'Platform linked successfully',
    data: linkedPlatform,
  });
});

// @desc    Unlink platform account
// @route   DELETE /api/v1/users/unlink-platform/:platform
// @access  Private
const unlinkPlatform = asyncHandler(async (req, res) => {
  await userService.unlinkPlatform(req.user.id, req.params.platform);
  successResponse(res, null, 'Platform unlinked successfully');
});

// @desc    Get linked platforms
// @route   GET /api/v1/users/linked-platforms
// @access  Private
const getLinkedPlatforms = asyncHandler(async (req, res) => {
  const platforms = await userService.getLinkedPlatforms(req.user.id);
  successResponse(res, platforms, 'Linked platforms retrieved successfully');
});

// @desc    Update platform username
// @route   PUT /api/v1/users/platform/:platform
// @access  Private
const updatePlatformUsername = asyncHandler(async (req, res) => {
  const { platformUsername } = req.body;

  const linkedPlatform = await userService.updatePlatformUsername(
    req.user.id,
    req.params.platform,
    platformUsername
  );

  successResponse(res, linkedPlatform, 'Platform username updated successfully');
});

// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user.id);
  successResponse(res, null, 'Account deleted successfully');
});

// @desc    Get user dashboard
// @route   GET /api/v1/users/dashboard
// @access  Private
const getUserDashboard = asyncHandler(async (req, res) => {
  const dashboard = await userService.getUserDashboard(req.user.id);
  successResponse(res, dashboard, 'Dashboard retrieved successfully');
});

module.exports = {
  getUserProfile,
  updateUserProfile,
  linkPlatform,
  unlinkPlatform,
  getLinkedPlatforms,
  updatePlatformUsername,
  deleteAccount,
  getUserDashboard,
};
