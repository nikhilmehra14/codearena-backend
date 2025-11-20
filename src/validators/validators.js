const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errorHandler');

// Validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    throw new ValidationError(errorMessages.join(', '));
  }
  next();
};

// User registration validation
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers'),
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('fullName').optional().trim().isLength({ max: 100 }).withMessage('Full name must not exceed 100 characters'),
  validate,
];

// User login validation
const validateLogin = [
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// Update profile validation
const validateUpdateProfile = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers'),
  body('fullName').optional().trim().isLength({ max: 100 }).withMessage('Full name must not exceed 100 characters'),
  body('timezone').optional().trim().isString(),
  body('notificationEnabled').optional().isBoolean().withMessage('Notification enabled must be a boolean'),
  body('notificationTime')
    .optional()
    .isInt({ min: 5, max: 1440 })
    .withMessage('Notification time must be between 5 and 1440 minutes'),
  body('darkMode').optional().isBoolean().withMessage('Dark mode must be a boolean'),
  validate,
];

// Link platform validation
const validateLinkPlatform = [
  body('platform')
    .isIn(['leetcode', 'codeforces', 'codechef', 'atcoder', 'hackerrank', 'hackerearth'])
    .withMessage('Invalid platform'),
  body('platformUsername').trim().notEmpty().withMessage('Platform username is required'),
  validate,
];

// Reminder validation
const validateReminder = [
  body('contestId').isUUID().withMessage('Invalid contest ID'),
  body('reminderTime')
    .optional()
    .isInt({ min: 5, max: 1440 })
    .withMessage('Reminder time must be between 5 and 1440 minutes'),
  validate,
];

// Contest query validation
const validateContestQuery = [
  query('platform')
    .optional()
    .isIn(['leetcode', 'codeforces', 'codechef', 'atcoder', 'hackerrank', 'hackerearth'])
    .withMessage('Invalid platform'),
  query('status').optional().isIn(['upcoming', 'ongoing', 'completed']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate,
];

// UUID param validation
const validateUUID = [param('id').isUUID().withMessage('Invalid ID format'), validate];

module.exports = {
  validate,
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateLinkPlatform,
  validateReminder,
  validateContestQuery,
  validateUUID,
};
