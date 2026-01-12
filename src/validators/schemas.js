const { z } = require('zod');

/**
 * Zod validation schemas for the application
 * Replaces express-validator with more type-safe validation
 */

// Reusable field schemas
const emailSchema = z
  .string()
  .email('Please provide a valid email address')
  .toLowerCase()
  .trim();

const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be less than 50 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .trim()
  .toLowerCase();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)'
  );

const phoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g., +919876543210)')
  .optional();

const uuidSchema = z.string().uuid('Invalid ID format');

const platformSchema = z.enum([
  'leetcode',
  'codeforces',
  'codechef',
  'atcoder',
  'hackerrank',
  'hackerearth',
], { errorMap: () => ({ message: 'Invalid platform' }) });

const contestStatusSchema = z.enum(['upcoming', 'ongoing', 'completed'], {
  errorMap: () => ({ message: 'Invalid status' }),
});

// Auth schemas
const registerSchema = z.object({
  body: z.object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    fullName: z.string().max(100, 'Full name must be less than 100 characters').trim().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

const verifyOTPSchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
  }),
});

const resendOTPSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Reset token is required'),
  }),
  body: z.object({
    password: passwordSchema,
  }),
});

const updatePhoneNumberSchema = z.object({
  body: z.object({
    phoneNumber: phoneNumberSchema.refine(val => val !== undefined, {
      message: 'Phone number is required',
    }),
  }),
});

const updateNotificationPreferencesSchema = z.object({
  body: z.object({
    notifyViaPush: z.boolean().optional(),
    notifyViaWhatsApp: z.boolean().optional(),
    notifyViaEmail: z.boolean().optional(),
  }),
});

// User schemas
const updateProfileSchema = z.object({
  body: z.object({
    username: usernameSchema.optional(),
    fullName: z.string().max(100, 'Full name must be less than 100 characters').trim().optional(),
    bio: z.string().max(500, 'Bio must be less than 500 characters').trim().optional(),
    country: z.string().max(100, 'Country must be less than 100 characters').trim().optional(),
    phoneNumber: phoneNumberSchema,
    timezone: z.string().trim().optional(),
    notificationEnabled: z.boolean().optional(),
    notificationTime: z
      .number()
      .int()
      .min(5, 'Notification time must be at least 5 minutes')
      .max(1440, 'Notification time must be less than 1440 minutes (24 hours)')
      .optional(),
    darkMode: z.boolean().optional(),
    preferredPlatforms: z.array(platformSchema).max(10, 'Maximum 10 platforms allowed').optional(),
  }),
});

const linkPlatformSchema = z.object({
  body: z.object({
    platform: platformSchema,
    platformUsername: z.string().min(1, 'Platform username is required').trim(),
  }),
});

const updatePlatformUsernameSchema = z.object({
  params: z.object({
    platform: platformSchema,
  }),
  body: z.object({
    platformUsername: z.string().min(1, 'Platform username is required').trim(),
  }),
});

// Reminder schemas
const addReminderSchema = z.object({
  body: z.object({
    contestId: uuidSchema,
    reminderTime: z
      .number()
      .int()
      .min(5, 'Reminder time must be at least 5 minutes')
      .max(1440, 'Reminder time must be less than 1440 minutes (24 hours)')
      .optional(),
  }),
});

const updateReminderSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    reminderTime: z
      .number()
      .int()
      .min(5, 'Reminder time must be at least 5 minutes')
      .max(1440, 'Reminder time must be less than 1440 minutes (24 hours)')
      .optional(),
  }),
});

// Contest schemas
const getContestsSchema = z.object({
  query: z.object({
    platform: platformSchema.optional(),
    status: contestStatusSchema.optional(),
    page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional(),
    limit: z.coerce.number().int().min(1).max(100, 'Limit must be between 1 and 100').optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
});

const getContestByIdSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

const getContestsByPlatformSchema = z.object({
  params: z.object({
    platform: platformSchema,
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

// Generic UUID param schema
const uuidParamSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

// Stats schemas
const getPlatformStatsSchema = z.object({
  params: z.object({
    platform: platformSchema,
  }),
});

const syncPlatformStatsSchema = z.object({
  params: z.object({
    platform: platformSchema,
  }),
});

// Query schemas
const checkUsernameSchema = z.object({
  query: z.object({
    username: usernameSchema,
  }),
});

const checkEmailSchema = z.object({
  query: z.object({
    email: emailSchema,
  }),
});

const loginHistorySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
  }),
});

module.exports = {
  // Auth
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  resendOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePhoneNumberSchema,
  updateNotificationPreferencesSchema,
  checkUsernameSchema,
  checkEmailSchema,
  loginHistorySchema,

  // User
  updateProfileSchema,
  linkPlatformSchema,
  updatePlatformUsernameSchema,

  // Reminder
  addReminderSchema,
  updateReminderSchema,

  // Contest
  getContestsSchema,
  getContestByIdSchema,
  getContestsByPlatformSchema,

  // Stats
  getPlatformStatsSchema,
  syncPlatformStatsSchema,

  // Generic
  uuidParamSchema,
};


