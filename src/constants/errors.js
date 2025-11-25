/**
 * Error messages used throughout the application
 * Provides consistency in error messaging
 */

module.exports = {
  // Authentication errors
  AUTH: {
    UNAUTHORIZED: 'Not authorized to access this resource',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_DEACTIVATED: 'Account is deactivated',
    EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
    INVALID_TOKEN: 'Invalid or expired token',
    TOKEN_EXPIRED: 'Token has expired',
    NO_TOKEN: 'No authentication token provided',
    USER_NOT_FOUND: 'User not found or inactive',
    ADMIN_REQUIRED: 'Administrator privileges required',
  },

  // Validation errors
  VALIDATION: {
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_USERNAME: 'Username can only contain letters, numbers, and underscores',
    USERNAME_LENGTH: 'Username must be between 3 and 50 characters',
    PASSWORD_WEAK: 'Password must contain uppercase, lowercase, number, and special character',
    PASSWORD_LENGTH: 'Password must be between 8 and 128 characters',
    REQUIRED_FIELD: (field) => `${field} is required`,
    INVALID_UUID: 'Invalid ID format',
    INVALID_PLATFORM: 'Invalid platform specified',
    INVALID_STATUS: 'Invalid status specified',
  },

  // Resource errors
  RESOURCE: {
    NOT_FOUND: (resource) => `${resource} not found`,
    ALREADY_EXISTS: (resource) => `${resource} already exists`,
    CONFLICT: 'Resource conflict detected',
  },

  // Rate limiting
  RATE_LIMIT: {
    TOO_MANY_REQUESTS: 'Too many requests, please try again later',
    TOO_MANY_AUTH_ATTEMPTS: 'Too many authentication attempts, please try again after 15 minutes',
    TOO_MANY_REGISTRATIONS: 'Too many accounts created from this IP, please try again after an hour',
    OTP_RATE_LIMIT: (seconds) => `Please wait ${seconds} seconds before requesting a new OTP`,
  },

  // Service errors
  SERVICE: {
    EMAIL_NOT_CONFIGURED: 'Email service is not configured',
    WHATSAPP_NOT_CONFIGURED: 'WhatsApp service is not configured',
    FIREBASE_NOT_CONFIGURED: 'Firebase messaging is not configured',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    DATABASE_ERROR: 'Database operation failed',
  },
};

