const reminderService = require('../services/reminderService');
const { asyncHandler } = require('../utils/errorHandler');
const { successResponse, paginatedResponse } = require('../utils/response');

// @desc    Add reminder
// @route   POST /api/v1/reminders
// @access  Private
const addReminder = asyncHandler(async (req, res) => {
  const { contestId, reminderTime } = req.body;
  const userId = req.user.id;

  // Use user's default reminder time if not provided
  const time = reminderTime || req.user.notificationTime || 30;

  const reminder = await reminderService.addReminder(userId, contestId, time);

  res.status(201).json({
    success: true,
    message: 'Reminder added successfully',
    data: reminder,
  });
});

// @desc    Get user's reminders
// @route   GET /api/v1/reminders
// @access  Private
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

// @desc    Get reminder by ID
// @route   GET /api/v1/reminders/:id
// @access  Private
const getReminderById = asyncHandler(async (req, res) => {
  const reminder = await reminderService.getReminderById(req.params.id, req.user.id);
  successResponse(res, reminder, 'Reminder retrieved successfully');
});

// @desc    Update reminder
// @route   PUT /api/v1/reminders/:id
// @access  Private
const updateReminder = asyncHandler(async (req, res) => {
  const { reminderTime } = req.body;

  const reminder = await reminderService.updateReminder(req.params.id, req.user.id, {
    reminderTime,
  });

  successResponse(res, reminder, 'Reminder updated successfully');
});

// @desc    Delete reminder
// @route   DELETE /api/v1/reminders/:id
// @access  Private
const deleteReminder = asyncHandler(async (req, res) => {
  await reminderService.deleteReminder(req.params.id, req.user.id);
  successResponse(res, null, 'Reminder deleted successfully');
});

// @desc    Get reminder statistics
// @route   GET /api/v1/reminders/stats
// @access  Private
const getReminderStats = asyncHandler(async (req, res) => {
  const stats = await reminderService.getUserReminderStats(req.user.id);
  successResponse(res, stats, 'Reminder statistics retrieved successfully');
});

module.exports = {
  addReminder,
  getUserReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  getReminderStats,
};
