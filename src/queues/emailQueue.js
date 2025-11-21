const Queue = require('bull');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Create email queue with Redis connection
const emailQueue = new Queue('email-queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
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

// Process email jobs
emailQueue.process('send-otp', async (job) => {
  const { email, otp, username } = job.data;
  
  try {
    logger.info(`Processing OTP email job for ${email}`);
    
    if (emailService.isConfigured()) {
      await emailService.sendOTPEmail(email, otp, username);
      logger.info(`OTP email sent successfully to ${email}`);
      return { success: true, email, timestamp: new Date().toISOString() };
    } else {
      throw new Error('Email service not configured');
    }
  } catch (error) {
    logger.error(`Failed to send OTP email to ${email}:`, error);
    throw error;
  }
});

// Process welcome email jobs
emailQueue.process('send-welcome', async (job) => {
  const { email, username } = job.data;
  
  try {
    logger.info(`Processing welcome email job for ${email}`);
    
    if (emailService.isConfigured()) {
      await emailService.sendWelcomeEmail(email, username);
      logger.info(`Welcome email sent successfully to ${email}`);
      return { success: true, email, timestamp: new Date().toISOString() };
    } else {
      throw new Error('Email service not configured');
    }
  } catch (error) {
    logger.error(`Failed to send welcome email to ${email}:`, error);
    throw error;
  }
});

// Event listeners for monitoring
emailQueue.on('completed', (job, result) => {
  logger.info(`Email job ${job.id} completed successfully:`, result);
});

emailQueue.on('failed', (job, err) => {
  logger.error(`Email job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

emailQueue.on('stalled', (job) => {
  logger.warn(`Email job ${job.id} has stalled`);
});

emailQueue.on('error', (error) => {
  logger.error('Email queue error:', error);
});

// Add OTP email job to queue
const addOTPEmailJob = async (email, otp, username) => {
  try {
    const job = await emailQueue.add('send-otp', {
      email,
      otp,
      username,
    }, {
      priority: 1,
      delay: 0,
      timeout: 30000, // 30 seconds timeout
    });
    
    logger.info(`OTP email job ${job.id} added to queue for ${email}`);
    return job;
  } catch (error) {
    logger.error('Failed to add OTP email job to queue:', error);
    throw error;
  }
};

// Add welcome email job to queue
const addWelcomeEmailJob = async (email, username) => {
  try {
    const job = await emailQueue.add('send-welcome', {
      email,
      username,
    }, {
      priority: 2,
      delay: 0,
      timeout: 30000, // 30 seconds timeout
    });
    
    logger.info(`Welcome email job ${job.id} added to queue for ${email}`);
    return job;
  } catch (error) {
    logger.error('Failed to add welcome email job to queue:', error);
    throw error;
  }
};

// Graceful shutdown handler
const closeQueue = async () => {
  logger.info('Closing email queue...');
  await emailQueue.close();
  logger.info('Email queue closed');
};

module.exports = {
  emailQueue,
  addOTPEmailJob,
  addWelcomeEmailJob,
  closeQueue,
};
