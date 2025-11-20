require('dotenv').config();

// Validation for production environment
const validateConfig = () => {
  const requiredVars = {
    production: [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'BACKEND_URL',
      'FRONTEND_URL',
      'DATABASE_URL',
      'CORS_ORIGIN',
    ],
  };

  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    const missing = requiredVars.production.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for production: ${missing.join(', ')}\n` +
        `Please set these in your .env file or environment.`
      );
    }
  }
};

// Run validation
validateConfig();

module.exports = {
  // Server Configuration
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'codearena',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      acquire: 30000,
      idle: 10000,
    },
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0,
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour default
    contestTTL: 1800, // 30 minutes
    statsTTL: 3600, // 1 hour
    userTTL: 600, // 10 minutes
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },

  // OAuth Configuration
  oauth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    github: {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
  },

  // Firebase Configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    adminKeyPath: process.env.FIREBASE_ADMIN_KEY_PATH,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map(url => url.trim()) || [],
    credentials: true,
  },

  // Cron Job Configuration
  cron: {
    contestFetch: process.env.CONTEST_FETCH_CRON || '0 */1 * * *', // Every hour
    notificationCheck: process.env.NOTIFICATION_CHECK_CRON || '*/5 * * * *', // Every 5 minutes
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
    retentionDays: process.env.LOG_RETENTION_DAYS || 7,
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    fromName: process.env.EMAIL_FROM_NAME || 'CodeArena',
  },

  // External APIs
  // Note: These are public API endpoints from third-party platforms
  // They are not hardcoded URLs for YOUR application, but external service URLs
  externalAPIs: {
    kontests: process.env.KONTESTS_API_URL || 'https://kontests.net/api/v1/all',
    clist: {
      base: process.env.CLIST_API_URL || 'https://clist.by/api/v4',
      username: process.env.CLIST_API_USERNAME,
      apiKey: process.env.CLIST_API_KEY,
    },
    codeforces: {
      base: process.env.CODEFORCES_API_URL || 'https://codeforces.com/api',
      apiKey: process.env.CODEFORCES_API_KEY,
      apiSecret: process.env.CODEFORCES_API_SECRET,
    },
    leetcode: {
      base: process.env.LEETCODE_API_URL || 'https://leetcode.com/graphql',
      session: process.env.LEETCODE_SESSION,
    },
    codechef: {
      base: process.env.CODECHEF_API_URL || 'https://www.codechef.com/api',
      apiKey: process.env.CODECHEF_API_KEY,
    },
    atcoder: {
      base: process.env.ATCODER_API_URL || 'https://atcoder.jp',
    },
  },

  // WhatsApp Configuration
  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    },
  },

  // Application URLs
  urls: {
    frontend: process.env.FRONTEND_URL,
    backend: process.env.BACKEND_URL,
  },

  // Notification Settings
  notifications: {
    defaultReminderTime: 30, // 30 minutes before contest
    batchSize: 50, // Number of notifications to send in one batch
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};
