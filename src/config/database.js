const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Configure Prisma logging based on environment
const prismaLogConfig = process.env.NODE_ENV === 'production'
  ? ['error', 'warn']
  : [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ];

const prisma = new PrismaClient({
  log: prismaLogConfig,
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Params: ${e.params}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

// Log errors
prisma.$on('error', (e) => {
  logger.error('Prisma Error:', e);
});

// Log warnings
prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning:', e);
});

// Test database connection
const testConnection = async () => {
  try {
    await prisma.$connect();
    // Test with a simple query
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✓ Database connection established successfully');
  } catch (error) {
    logger.error('✗ Unable to connect to database:', error);
    logger.error('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    throw error;
  }
};

// Graceful shutdown
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
};

module.exports = { prisma, testConnection, disconnectDatabase };
