require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport');

const config = require('./config/config');
const logger = require('./utils/logger');
const { testConnection } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeFirebase } = require('./config/firebase');
const { handleError } = require('./utils/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');
const cronJobs = require('./utils/cronJobs');

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session middleware (required for Passport OAuth)
app.use(
  session({
    secret: config.jwt.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.env === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Compression middleware
app.use(compression());

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// Rate limiting
app.use('/api', apiLimiter);

// API Routes
app.use(`/api/${config.apiVersion}`, routes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CodeArena Backend API',
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use(handleError);

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    try {
      await testConnection();
    } catch (dbError) {
      logger.error('Database connection failed:', dbError.message);
      logger.error('Please check your DATABASE_URL in .env file');
      process.exit(1);
    }

    // Connect to Redis (non-critical)
    try {
      await connectRedis();
    } catch (redisError) {
      logger.warn('Redis connection failed - continuing without cache:', redisError.message);
      logger.warn('The application will work but performance may be reduced');
    }

    // Initialize Firebase (optional)
    try {
      initializeFirebase();
    } catch (error) {
      logger.warn('Firebase not initialized - push notifications will be disabled');
      logger.warn('Error:', error.message);
    }

    // Start cron jobs
    if (config.env !== 'test') {
      try {
        cronJobs.startAll();
      } catch (cronError) {
        logger.error('Failed to start cron jobs:', cronError.message);
        logger.warn('Continuing without scheduled tasks');
      }
    }

    // Start server
    const PORT = config.port || 5000;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${config.env} mode`);
      logger.info(`📡 API available at http://localhost:${PORT}/api/${config.apiVersion}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} signal received: closing HTTP server`);
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database connection
        try {
          const { disconnectDatabase } = require('./config/database');
          await disconnectDatabase();
        } catch (error) {
          logger.error('Error closing database:', error);
        }
        
        // Close Redis connection
        try {
          const { closeRedis } = require('./config/redis');
          await closeRedis();
        } catch (error) {
          logger.error('Error closing Redis:', error);
        }
        
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
