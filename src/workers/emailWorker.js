const { emailQueue, closeQueue } = require('../queues/emailQueue');
const logger = require('../utils/logger');

logger.info('Email worker started and listening for jobs...');

// Handle graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received, closing email queue gracefully...`);
  try {
    await closeQueue();
    logger.info('Email worker shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during email worker shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in email worker:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in email worker:', reason);
});

logger.info('Email worker is ready to process jobs');
