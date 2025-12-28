const reminderService = require('../services/reminderService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse, paginatedResponse } = require('../utils/response');
const { HttpStatus } = require('../constants/httpStatus');

const addReminder = asyncHandler(async (req, res) => {
  const { contestId, reminderTime, async = false } = req.body;
  const userId = req.user.id;

  // Use user's default reminder time if not provided
  const time = reminderTime || req.user.notificationTime || 30;

  // Use async queue for high-scale operations
  if (async === true) {
    const result = await reminderService.addReminderAsync(userId, contestId, time);
    
    // Check if it was a toggle-off (removal)
    if (result.isSet === false) {
      return res.status(HttpStatus.OK.code).json({
        success: true,
        message: 'Reminder removed successfully',
        data: result,
      });
    }

    return res.status(HttpStatus.ACCEPTED.code).json({
      success: true,
      message: 'Reminder is being created',
      data: result,
    });
  }

  // Synchronous mode (default for backward compatibility)
  const result = await reminderService.addReminder(userId, contestId, time);
  
  if (result.isSet === false) {
    return res.status(HttpStatus.OK.code).json({
      success: true,
      message: 'Reminder removed successfully',
      data: { isSet: false },
    });
  }

  res.status(HttpStatus.CREATED.code).json({
    success: true,
    message: 'Reminder added successfully',
    data: result,
  });
});

const getUserReminders = asyncHandler(async (req, res) => {
  const { includeCompleted, page, limit } = req.query;

  const result = await reminderService.getUserReminders(req.user.id, {
    includeCompleted: includeCompleted === 'true',
    page: page || 1,
    limit: limit || 20,
  });

  paginatedResponse(
    res,
    result.reminders,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
    'Reminders retrieved successfully'
  );
});

const getReminderById = asyncHandler(async (req, res) => {
  const reminder = await reminderService.getReminderById(req.params.id, req.user.id);
  successResponse(res, reminder, 'Reminder retrieved successfully');
});

const updateReminder = asyncHandler(async (req, res) => {
  const { reminderTime } = req.body;

  const reminder = await reminderService.updateReminder(req.params.id, req.user.id, {
    reminderTime,
  });

  successResponse(res, reminder, 'Reminder updated successfully');
});

const deleteReminder = asyncHandler(async (req, res) => {
  await reminderService.deleteReminder(req.params.id, req.user.id);
  successResponse(res, null, 'Reminder deleted successfully');
});

const getReminderStats = asyncHandler(async (req, res) => {
  const stats = await reminderService.getUserReminderStats(req.user.id);
  successResponse(res, stats, 'Reminder statistics retrieved successfully');
});

const getJobStatus = asyncHandler(async (req, res) => {
  const { getJobStatus: getStatus } = require('../queues/reminderQueue');
  const status = await getStatus(req.params.jobId);
  
  if (!status) {
    return res.status(HttpStatus.NOT_FOUND.code).json({
      success: false,
      message: 'Job not found',
    });
  }
  
  successResponse(res, status, 'Job status retrieved successfully');
});

module.exports = {
  addReminder,
  getUserReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  getReminderStats,
  getJobStatus,
};
