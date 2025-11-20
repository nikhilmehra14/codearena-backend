const statsService = require('../services/statsService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse } = require('../utils/response');

// @desc    Get platform stats
// @route   GET /api/v1/stats/:platform
// @access  Private
const getPlatformStats = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const stats = await statsService.getPlatformStats(req.user.id, platform);
  successResponse(res, stats, 'Platform stats retrieved successfully');
});

// @desc    Get all user stats
// @route   GET /api/v1/stats
// @access  Private
const getAllUserStats = asyncHandler(async (req, res) => {
  const stats = await statsService.getAllUserStats(req.user.id);
  successResponse(res, stats, 'All stats retrieved successfully');
});

// @desc    Sync platform stats
// @route   POST /api/v1/stats/:platform/sync
// @access  Private
const syncPlatformStats = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const stats = await statsService.syncPlatformStats(req.user.id, platform);
  successResponse(res, stats, 'Stats synced successfully');
});

// @desc    Get user stats summary
// @route   GET /api/v1/stats/summary
// @access  Private
const getUserStatsSummary = asyncHandler(async (req, res) => {
  const summary = await statsService.getUserStatsSummary(req.user.id);
  successResponse(res, summary, 'Stats summary retrieved successfully');
});

module.exports = {
  getPlatformStats,
  getAllUserStats,
  syncPlatformStats,
  getUserStatsSummary,
};
