const contestService = require('../services/contestService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse, paginatedResponse } = require('../utils/response');

const getContests = asyncHandler(async (req, res) => {
  const { platform, status, page, limit, startDate, endDate, usePreferences } = req.query;
  const userId = req.user?.id; // Get userId from optionalAuth middleware

  const result = await contestService.getContests({
    platform,
    status,
    page: page || 1,
    limit: limit || 20,
    startDate,
    endDate,
    userId, // Pass userId to service
    usePreferences: usePreferences === 'true', // Convert string to boolean
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

const getContestById = asyncHandler(async (req, res) => {
  const userId = req.user?.id; // Get userId from optionalAuth middleware
  const contest = await contestService.getContestById(req.params.id, userId);
  successResponse(res, contest, 'Contest retrieved successfully');
});

const getUpcomingContests = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const userId = req.user?.id; // Get userId from optionalAuth middleware
  const contests = await contestService.getUpcomingContests(limit || 10, userId);
  successResponse(res, contests, 'Upcoming contests retrieved successfully');
});

const getContestsByPlatform = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { limit } = req.query;
  const userId = req.user?.id; // Get userId from optionalAuth middleware
  const contests = await contestService.getContestsByPlatform(platform, limit || 20, userId);
  successResponse(res, contests, 'Platform contests retrieved successfully');
});

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
