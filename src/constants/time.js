/**
 * Time constants used throughout the application
 * All values are in seconds unless specified otherwise
 */

module.exports = {
  // Seconds
  SECONDS: {
    ONE_MINUTE: 60,
    FIVE_MINUTES: 300,
    TEN_MINUTES: 600,
    FIFTEEN_MINUTES: 900,
    THIRTY_MINUTES: 1800,
    ONE_HOUR: 3600,
    ONE_DAY: 86400,
    SEVEN_DAYS: 604800,
    THIRTY_DAYS: 2592000,
  },

  // Minutes (for user-facing values)
  MINUTES: {
    FIVE: 5,
    TEN: 10,
    FIFTEEN: 15,
    THIRTY: 30,
    SIXTY: 60,
    MAX_REMINDER_TIME: 1440, // 24 hours
  },

  // Milliseconds (for setTimeout, setInterval, etc.)
  MILLISECONDS: {
    ONE_SECOND: 1000,
    FIVE_SECONDS: 5000,
    TEN_SECONDS: 10000,
    ONE_MINUTE: 60000,
    FIVE_MINUTES: 300000,
    TEN_MINUTES: 600000,
    NOTIFICATION_DELAY: 100, // Delay between notifications to avoid overwhelming FCM
  },  CACHE_TTL: {
    SHORT: 300,      // 5 minutes
    MEDIUM: 600,     // 10 minutes
    LONG: 1800,      // 30 minutes
    CONTEST: 1800,   // 30 minutes
    USER: 600,       // 10 minutes
    STATS: 3600,     // 1 hour
  },

  // OTP Settings
  OTP: {
    EXPIRY: 600,           // 10 minutes
    RATE_LIMIT: 60,        // 1 minute between resend attempts
  },

  // Token expiry
  TOKEN: {
    ACCESS_TOKEN_EXPIRY: '7d',
    REFRESH_TOKEN_EXPIRY: '30d',
    REFRESH_TOKEN_DAYS: 30,
  },

  // Database cleanup
  CLEANUP: {
    OLD_CONTEST_DAYS: 30,
    OLD_REMINDER_DAYS: 30,
  },

  // Cron expressions
  CRON: {
    EVERY_MINUTE: '* * * * *',
    EVERY_FIVE_MINUTES: '*/5 * * * *',
    EVERY_FIFTEEN_MINUTES: '*/15 * * * *',
    EVERY_HOUR: '0 * * * *',
    DAILY_AT_2AM: '0 2 * * *',
  },
};


