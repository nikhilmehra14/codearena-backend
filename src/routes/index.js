const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { HttpStatus } = require('../constants/httpStatus');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const contestRoutes = require('./contestRoutes');
const reminderRoutes = require('./reminderRoutes');
const statsRoutes = require('./statsRoutes');

// Enhanced health check route
router.get('/health', async (req, res) => {
  const health = {
    success: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
  } catch (error) {
    logger.error('Health check - Database error:', error);
    health.services.database = 'disconnected';
    health.success = false;
  }

  // Check Redis connection
  try {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isOpen) {
      health.services.redis = 'connected';
    } else {
      health.services.redis = 'disconnected';
    }
  } catch (error) {
    logger.error('Health check - Redis error:', error);
    health.services.redis = 'disconnected';
  }

  // Set appropriate status code
  const statusCode = health.success ? HttpStatus.OK.code : HttpStatus.SERVICE_UNAVAILABLE.code;

  res.status(statusCode).json(health);
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contests', contestRoutes);
router.use('/reminders', reminderRoutes);
router.use('/stats', statsRoutes);

module.exports = router;
