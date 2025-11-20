const contestService = require('../services/contestService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse, paginatedResponse } = require('../utils/response');

// @desc    Get all contests
// @route   GET /api/v1/contests
// @access  Public
const getContests = asyncHandler(async (req, res) => {
  const { platform, status, page, limit, startDate, endDate } = req.query;

  const result = await contestService.getContests({
    platform,
    status,
    page: page || 1,
    limit: limit || 20,
    startDate,
    endDate,
  });

  paginatedResponse(
    res,
    result.contests,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
    'Contests retrieved successfully'
  );
});

// @desc    Get contest by ID
// @route   GET /api/v1/contests/:id
// @access  Public
const getContestById = asyncHandler(async (req, res) => {
  const contest = await contestService.getContestById(req.params.id);
  successResponse(res, contest, 'Contest retrieved successfully');
});

// @desc    Get upcoming contests
// @route   GET /api/v1/contests/upcoming
// @access  Public
const getUpcomingContests = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const contests = await contestService.getUpcomingContests(limit || 10);
  successResponse(res, contests, 'Upcoming contests retrieved successfully');
});

// @desc    Get contests by platform
// @route   GET /api/v1/contests/platform/:platform
// @access  Public
const getContestsByPlatform = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { limit } = req.query;
  const contests = await contestService.getContestsByPlatform(platform, limit || 20);
  successResponse(res, contests, 'Platform contests retrieved successfully');
});

// @desc    Sync contests from external API
// @route   POST /api/v1/contests/sync
// @access  Public (should be protected in production or called by cron)
const syncContests = asyncHandler(async (req, res) => {
  const result = await contestService.syncContests();
  successResponse(res, result, 'Contests synced successfully');
});

module.exports = {
  getContests,
  getContestById,
  getUpcomingContests,
  getContestsByPlatform,
  syncContests,
};
