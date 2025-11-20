const cron = require('node-cron');
const contestService = require('../services/contestService');
const notificationService = require('../services/notificationService');
const config = require('../config/config');
const logger = require('../utils/logger');

class CronJobs {
  // Contest fetch job - runs every hour
  startContestFetchJob() {
    try {
      cron.schedule(config.cron.contestFetch, async () => {
        try {
          const result = await contestService.syncContests();
          
          // Only log if contests were synced
          if (result.synced > 0) {
            logger.info(`Contest fetch job completed: ${result.synced} contests synced`);
          }
        } catch (error) {
          logger.error('Error in contest fetch cron job:', error);
          // Don't throw - let cron continue for next scheduled run
        }
      });

      logger.info(`Contest fetch cron job scheduled: ${config.cron.contestFetch}`);
    } catch (error) {
      logger.error('Failed to schedule contest fetch job:', error);
    }
  }

  // Notification check job - runs every 5 minutes
  startNotificationCheckJob() {
    try {
      cron.schedule(config.cron.notificationCheck, async () => {
        try {
          const result = await notificationService.processPendingReminders();
          
          // Only log if reminders were sent or failed
          if (result.success > 0 || result.failed > 0) {
            logger.info(`Notification check job completed: ${result.success} sent, ${result.failed} failed`);
          }
        } catch (error) {
          logger.error('Error in notification check cron job:', error);
          // Don't throw - let cron continue for next scheduled run
        }
      });

      logger.info(`Notification check cron job scheduled: ${config.cron.notificationCheck}`);
    } catch (error) {
      logger.error('Failed to schedule notification check job:', error);
    }
  }

  // Contest status update job - runs every 15 minutes
  startContestStatusUpdateJob() {
    try {
      cron.schedule('*/15 * * * *', async () => {
        try {
          const updatedCount = await contestService.updateContestStatuses();
          
          // Only log if contests were actually updated
          if (updatedCount > 0) {
            logger.info(`Contest status update job completed: ${updatedCount} contests updated`);
          }
        } catch (error) {
          logger.error('Error in contest status update cron job:', error);
          // Don't throw - let cron continue for next scheduled run
        }
      });

      logger.info('Contest status update cron job scheduled: */15 * * * *');
    } catch (error) {
      logger.error('Failed to schedule contest status update job:', error);
    }
  }

  // Database cleanup job - runs daily at 2 AM
  startDatabaseCleanupJob() {
    try {
      cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running database cleanup cron job...');
        
        const { prisma } = require('../config/database');

        // Delete completed contests older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deletedContests = await prisma.contest.deleteMany({
          where: {
            status: 'completed',
            endTime: { lt: thirtyDaysAgo },
          },
        });

        // Delete old reminders for completed contests
        const deletedReminders = await prisma.reminder.deleteMany({
          where: {
            notificationSent: true,
            createdAt: { lt: thirtyDaysAgo },
          },
        });

        // Delete expired refresh tokens
        const deletedTokens = await prisma.refreshToken.deleteMany({
          where: {
            expiresAt: { lt: new Date() },
          },
        });

        logger.info(
          `Database cleanup completed: ${deletedContests.count} contests, ${deletedReminders.count} reminders, ${deletedTokens.count} tokens deleted`
        );
      } catch (error) {
        logger.error('Error in database cleanup cron job:', error);
        // Don't throw - let cron continue for next scheduled run
      }
    });

    logger.info('Database cleanup cron job scheduled: 0 2 * * *');
    } catch (error) {
      logger.error('Failed to schedule database cleanup job:', error);
    }
  }

  // Start all cron jobs
  startAll() {
    try {
      logger.info('Starting all cron jobs...');
      
      this.startContestFetchJob();
      this.startNotificationCheckJob();
      this.startContestStatusUpdateJob();
      this.startDatabaseCleanupJob();
      
      logger.info('✓ All cron jobs started');
    } catch (error) {
      logger.error('Error starting cron jobs:', error);
      // Don't throw - allow server to continue even if cron jobs fail
    }
  }
}

module.exports = new CronJobs();
