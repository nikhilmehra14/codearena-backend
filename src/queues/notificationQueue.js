const Queue = require('bull');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const config = require('../config/config');

// Create notification queue with Redis connection
const notificationQueue = new Queue('notification-queue', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.db,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Process notification jobs
// Concurrency: 50 jobs at a time
notificationQueue.process('send-contest-reminder', 50, async (job) => {
  const { reminder } = job.data;
  
  try {
    // Idempotency check: Verify if reminder was already sent
    // This prevents double notifications if a job is retried
    const { prisma } = require('../config/database');
    const currentReminder = await prisma.reminder.findUnique({
      where: { id: reminder.id },
      select: { notificationSent: true }
    });

    if (!currentReminder || currentReminder.notificationSent) {
      logger.info(`Skipping reminder ${reminder.id} - already sent or deleted`);
      return { success: true, skipped: true };
    }

    // We need to require notificationService inside the process function 
    // or ensure circular dependencies are handled if notificationService uses the queue
    // In this case, notificationService uses the queue to ADD jobs, 
    // and the queue uses notificationService to PROCESS jobs.
    // To avoid circular dependency issues during initialization, we'll use the imported instance.
    
    // Note: We are calling the method that sends the actual notification, 
    // NOT the one that adds to queue (which would be an infinite loop)
    await notificationService.sendContestReminder(reminder);
    
    return { success: true, reminderId: reminder.id, timestamp: new Date().toISOString() };
  } catch (error) {
    logger.error(`Failed to process reminder ${reminder.id}:`, error);
    throw error;
  }
});

// Event listeners
notificationQueue.on('completed', (job, result) => {
  // Optional: reduce logging noise for high volume
  // logger.info(`Notification job ${job.id} completed`);
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Notification job ${job.id} failed:`, err.message);
});

notificationQueue.on('error', (error) => {
  logger.error('Notification queue error:', error);
});

// Add reminder job to queue
const addReminderJob = async (reminder) => {
  try {
    const job = await notificationQueue.add('send-contest-reminder', {
      reminder,
    }, {
      priority: 1,
      removeOnComplete: true,
    });
    
    return job;
  } catch (error) {
    logger.error('Failed to add reminder job to queue:', error);
    throw error;
  }
};

// Graceful shutdown
const closeNotificationQueue = async () => {
  await notificationQueue.close();
};

module.exports = {
  notificationQueue,
  addReminderJob,
  closeNotificationQueue,
};
