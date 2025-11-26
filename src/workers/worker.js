const { emailQueue, closeQueue: closeEmailQueue } = require('../queues/emailQueue');
const { notificationQueue, closeNotificationQueue } = require('../queues/notificationQueue');
const { reminderQueue, closeReminderQueue } = require('../queues/reminderQueue');
const logger = require('../utils/logger');

logger.info('🚀 Worker process started');
logger.info('📧 Email worker listening...');
logger.info('🔔 Notification worker listening (Concurrency: 50)...');
logger.info('⏰ Reminder worker listening (Concurrency: 100)...');

// Handle graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received, closing queues gracefully...`);
  try {
    await Promise.all([
      closeEmailQueue(),
      closeNotificationQueue(),
      closeReminderQueue(),
    ]);
    logger.info('All workers shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during worker shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in worker:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in worker:', reason);
});
