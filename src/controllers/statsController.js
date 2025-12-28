const statsService = require('../services/statsService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse } = require('../utils/response');

const getPlatformStats = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const stats = await statsService.getPlatformStats(req.user.id, platform);
  successResponse(res, stats, 'Platform stats retrieved successfully');
});

const getAllUserStats = asyncHandler(async (req, res) => {
  const stats = await statsService.getAllUserStats(req.user.id);
  successResponse(res, stats, 'All stats retrieved successfully');
});

const syncPlatformStats = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const stats = await statsService.syncPlatformStats(req.user.id, platform);
  successResponse(res, stats, 'Stats synced successfully');
});

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
