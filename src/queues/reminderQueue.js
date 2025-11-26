const Queue = require('bull');
const { prisma } = require('../config/database');
const { cacheDelPattern } = require('../config/redis');
const logger = require('../utils/logger');
const config = require('../config/config');

// Create reminder queue with Redis connection
const reminderQueue = new Queue('reminder-queue', {
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
    removeOnComplete: 100, // Keep last 100 completed jobs for debugging
    removeOnFail: false, // Keep failed jobs for analysis
  },
  limiter: {
    max: 10000, // Max 10k jobs per second
    duration: 1000,
  },
});

// Process reminder creation jobs
// Concurrency: 100 jobs at a time for high throughput
reminderQueue.process('create-reminder', 100, async (job) => {
  const { userId, contestId, reminderTime } = job.data;
  
  try {
    // Check if contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      throw new Error('Contest not found');
    }

    // Check if contest is upcoming
    if (contest.status === 'completed') {
      throw new Error('Cannot set reminder for completed contests');
    }

    // Check if reminder already exists
    const existingReminder = await prisma.reminder.findUnique({
      where: {
        userId_contestId: {
          userId,
          contestId,
        },
      },
    });

    if (existingReminder) {
      throw new Error('Reminder already exists for this contest');
    }

    // Calculate scheduled time
    const contestStartTime = new Date(contest.startTime);
    const scheduledTime = new Date(contestStartTime.getTime() - reminderTime * 60 * 1000);

    // Create reminder
    const reminder = await prisma.reminder.create({
      data: {
        userId,
        contestId,
        reminderTime,
        scheduledTime,
        notificationSent: false,
      },
      include: {
        contest: true,
      },
    });

    // Fire-and-forget cache invalidation (don't await)
    // This prevents blocking the queue worker
    cacheDelPattern(`reminders:user:${userId}*`).catch(err => {
      logger.error(`Cache invalidation failed for user ${userId}:`, err);
      // Don't throw - cache invalidation failure shouldn't fail the job
    });

    logger.info(`Reminder created for user ${userId}, contest ${contestId}`);

    return {
      success: true,
      reminderId: reminder.id,
      reminder,
    };
  } catch (error) {
    logger.error(`Failed to create reminder for user ${userId}, contest ${contestId}:`, error);
    throw error; // Re-throw to trigger retry
  }
});

// Process batch reminder creation jobs
reminderQueue.process('create-reminders-batch', 50, async (job) => {
  const { reminders } = job.data;
  
  try {
    const results = {
      created: [],
      failed: [],
    };

    // Process in batches of 100 for optimal performance
    const batchSize = 100;
    for (let i = 0; i < reminders.length; i += batchSize) {
      const batch = reminders.slice(i, i + batchSize);
      
      // Use Promise.allSettled to process all reminders even if some fail
      const batchResults = await Promise.allSettled(
        batch.map(async (reminderData) => {
          const { userId, contestId, reminderTime } = reminderData;
          
          // Check contest and create reminder
          const contest = await prisma.contest.findUnique({
            where: { id: contestId },
          });

          if (!contest || contest.status === 'completed') {
            throw new Error('Invalid contest');
          }

          const contestStartTime = new Date(contest.startTime);
          const scheduledTime = new Date(contestStartTime.getTime() - reminderTime * 60 * 1000);

          return await prisma.reminder.create({
            data: {
              userId,
              contestId,
              reminderTime,
              scheduledTime,
              notificationSent: false,
            },
          });
        })
      );

      // Categorize results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.created.push(result.value);
        } else {
          results.failed.push({
            data: batch[index],
            error: result.reason.message,
          });
        }
      });
    }

    logger.info(`Batch reminder creation: ${results.created.length} created, ${results.failed.length} failed`);

    return results;
  } catch (error) {
    logger.error('Batch reminder creation failed:', error);
    throw error;
  }
});

// Event listeners
reminderQueue.on('completed', (job, result) => {
  if (result.success) {
    logger.debug(`Reminder job ${job.id} completed successfully`);
  }
});

reminderQueue.on('failed', (job, err) => {
  logger.error(`Reminder job ${job.id} failed:`, err.message);
});

reminderQueue.on('error', (error) => {
  logger.error('Reminder queue error:', error);
});

reminderQueue.on('stalled', (job) => {
  logger.warn(`Reminder job ${job.id} stalled`);
});

// Add single reminder job to queue
const addReminderJob = async (userId, contestId, reminderTime) => {
  try {
    const job = await reminderQueue.add('create-reminder', {
      userId,
      contestId,
      reminderTime,
    }, {
      priority: 2, // Normal priority
      removeOnComplete: true,
    });
    
    logger.debug(`Reminder job ${job.id} queued for user ${userId}`);
    return job;
  } catch (error) {
    logger.error('Failed to add reminder job to queue:', error);
    throw error;
  }
};

// Add batch reminder jobs to queue
const addReminderBatchJob = async (reminders) => {
  try {
    const job = await reminderQueue.add('create-reminders-batch', {
      reminders,
    }, {
      priority: 3, // Lower priority for batch operations
    });
    
    logger.info(`Batch reminder job ${job.id} queued with ${reminders.length} reminders`);
    return job;
  } catch (error) {
    logger.error('Failed to add batch reminder job to queue:', error);
    throw error;
  }
};

// Get job status
const getJobStatus = async (jobId) => {
  try {
    const job = await reminderQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      state,
      progress,
      result,
      failedReason,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  } catch (error) {
    logger.error(`Failed to get job status for ${jobId}:`, error);
    return null;
  }
};

// Graceful shutdown
const closeReminderQueue = async () => {
  await reminderQueue.close();
  logger.info('Reminder queue closed');
};

module.exports = {
  reminderQueue,
  addReminderJob,
  addReminderBatchJob,
  getJobStatus,
  closeReminderQueue,
};
