const { prisma } = require('../config/database');
const { NotFoundError, ConflictError } = require('../utils/errorHandler');
const { cacheDelPattern } = require('../config/redis');
const logger = require('../utils/logger');

class ReminderService {
  // Add reminder
  async addReminder(userId, contestId, reminderTime) {
    // Check if contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      throw new NotFoundError('Contest not found');
    }

    // Check if contest is upcoming
    if (contest.status === 'completed') {
      throw new ConflictError('Cannot set reminder for completed contests');
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
      throw new ConflictError('Reminder already exists for this contest');
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

    // Clear user's reminder cache
    await cacheDelPattern(`reminders:user:${userId}*`);

    logger.info(`Reminder created for user ${userId}, contest ${contestId}`);

    return reminder;
  }

  // Get user's reminders
  async getUserReminders(userId, options = {}) {
    const { includeCompleted = false, page = 1, limit = 20 } = options;

    const skip = (page - 1) * limit;

    // Build where clause for reminders with contest filter
    const where = {
      userId,
      isActive: true,
    };

    // If not including completed, filter by contest status
    if (!includeCompleted) {
      where.contest = {
        status: { in: ['upcoming', 'ongoing'] },
      };
    }

    const [reminders, count] = await Promise.all([
      prisma.reminder.findMany({
        where,
        include: {
          contest: true,
        },
        orderBy: {
          contest: {
            startTime: 'asc',
          },
        },
        take: parseInt(limit),
        skip,
      }),
      prisma.reminder.count({
        where,
      }),
    ]);

    return {
      reminders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  // Get reminder by ID
  async getReminderById(reminderId, userId) {
    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
      include: {
        contest: true,
      },
    });

    if (!reminder) {
      throw new NotFoundError('Reminder not found');
    }

    return reminder;
  }

  // Update reminder
  async updateReminder(reminderId, userId, updates) {
    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
      include: {
        contest: true,
      },
    });

    if (!reminder) {
      throw new NotFoundError('Reminder not found');
    }

    // Update reminder time if provided
    if (updates.reminderTime !== undefined) {
      const contestStartTime = new Date(reminder.contest.startTime);
      const scheduledTime = new Date(contestStartTime.getTime() - updates.reminderTime * 60 * 1000);

      const updatedReminder = await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          reminderTime: updates.reminderTime,
          scheduledTime,
          notificationSent: false,
        },
      });

      // Clear cache
      await cacheDelPattern(`reminders:user:${userId}*`);

      logger.info(`Reminder ${reminderId} updated for user ${userId}`);

      return updatedReminder;
    }

    return reminder;
  }

  // Delete reminder
  async deleteReminder(reminderId, userId) {
    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!reminder) {
      throw new NotFoundError('Reminder not found');
    }

    await prisma.reminder.delete({
      where: { id: reminderId },
    });

    // Clear cache
    await cacheDelPattern(`reminders:user:${userId}*`);

    logger.info(`Reminder ${reminderId} deleted for user ${userId}`);

    return true;
  }

  // Get pending reminders for notification
  async getPendingReminders() {
    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

    const reminders = await prisma.reminder.findMany({
      where: {
        notificationSent: false,
        isActive: true,
        scheduledTime: {
          gte: now,
          lte: fiveMinutesLater,
        },
        contest: {
          status: { in: ['upcoming', 'ongoing'] },
        },
        user: {
          notificationEnabled: true,
          fcmToken: { not: null },
        },
      },
      include: {
        contest: true,
        user: true,
      },
    });

    return reminders;
  }

  // Mark reminder as notified
  async markAsNotified(reminderId) {
    const reminder = await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        notificationSent: true,
        notificationSentAt: new Date(),
      },
    });

    return reminder;
  }

  // Get reminder statistics for user
  async getUserReminderStats(userId) {
    const totalReminders = await prisma.reminder.count({
      where: { userId, isActive: true },
    });

    const upcomingReminders = await prisma.reminder.count({
      where: {
        userId,
        isActive: true,
        notificationSent: false,
        contest: {
          status: 'upcoming',
        },
      },
    });

    const notifiedReminders = await prisma.reminder.count({
      where: {
        userId,
        notificationSent: true,
      },
    });

    return {
      total: totalReminders,
      upcoming: upcomingReminders,
      notified: notifiedReminders,
    };
  }
}

module.exports = new ReminderService();
