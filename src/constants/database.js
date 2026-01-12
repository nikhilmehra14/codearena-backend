/**
 * Database-related constants
 */

module.exports = {
  // User select fields (to avoid duplication)
  USER_SELECT_FIELDS: {
    id: true,
    username: true,
    email: true,
    fullName: true,
    avatar: true,
    authProvider: true,
    isVerified: true,
    notificationEnabled: true,
    notificationTime: true,
    notifyViaPush: true,
    notifyViaWhatsApp: true,
    notifyViaEmail: true,
    darkMode: true,
    timezone: true,
    fcmToken: true,
    lastLogin: true,
    isActive: true,
    phoneNumber: true,
    createdAt: true,
    updatedAt: true,
  },

  // Batch sizes for bulk operations
  BATCH_SIZES: {
    CONTEST_SYNC: 20,
    NOTIFICATION_PROCESSING: 50,
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
};


