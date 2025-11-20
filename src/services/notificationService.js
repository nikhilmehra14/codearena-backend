const { getMessaging } = require('../config/firebase');
const reminderService = require('./reminderService');
const whatsappService = require('./whatsappService');
const logger = require('../utils/logger');
const { BadRequestError, ServiceError } = require('../utils/errorHandler');

class NotificationService {
  // Send push notification to a single device
  async sendPushNotification(fcmToken, notification, data = {}) {
    if (!fcmToken) {
      logger.warn('No FCM token provided');
      throw new BadRequestError('No FCM token provided');
    }

    const messaging = getMessaging();
    if (!messaging) {
      logger.warn('Firebase messaging not initialized');
      throw new ServiceError('Firebase messaging not initialized');
    }

    try {

      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image || undefined,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'contest_reminders',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.send(message);
      logger.info(`Push notification sent successfully: ${response}`);

      return { success: true, messageId: response };
    } catch (error) {
      logger.error('Error sending push notification:', error);

      // Handle invalid FCM tokens
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        logger.warn(`Invalid FCM token: ${fcmToken}`);
        // TODO: Mark FCM token as invalid in database
        throw new BadRequestError(`Invalid FCM token`);
      }

      throw new ServiceError(`Failed to send push notification: ${error.message}`);
    }
  }

  // Send push notification to multiple devices
  async sendMulticastNotification(fcmTokens, notification, data = {}) {
    if (!fcmTokens || fcmTokens.length === 0) {
      logger.warn('No FCM tokens provided');
      throw new BadRequestError('No FCM tokens provided');
    }

    const messaging = getMessaging();
    if (!messaging) {
      logger.warn('Firebase messaging not initialized');
      throw new ServiceError('Firebase messaging not initialized');
    }

    try {

      const message = {
        tokens: fcmTokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image || undefined,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'contest_reminders',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.sendMulticast(message);

      logger.info(
        `Multicast notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`
      );

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      logger.error('Error sending multicast notification:', error);
      throw new ServiceError(`Failed to send multicast notification: ${error.message}`);
    }
  }

  // Send contest reminder notification (multi-channel)
  async sendContestReminder(reminder) {
    try {
      const { user, contest } = reminder;

      const results = {
        push: { sent: false },
        whatsapp: { sent: false },
      };

      // Send Push Notification
      if (user.fcmToken && user.notifyViaPush !== false) {
        const notification = {
          title: `Contest Starting Soon! 🚀`,
          body: `${contest.name} starts in ${reminder.reminderTime} minutes on ${contest.platform}`,
          image: contest.platformLogo,
        };

        const data = {
          type: 'contest_reminder',
          contestId: contest.id,
          contestName: contest.name,
          contestUrl: contest.url,
          platform: contest.platform,
          startTime: contest.startTime.toISOString(),
        };

        const pushResult = await this.sendPushNotification(user.fcmToken, notification, data);
        results.push = { sent: pushResult.success, messageId: pushResult.messageId };
        
        if (pushResult.success) {
          logger.info(`Push notification sent for contest ${contest.id} to user ${user.id}`);
        }
      }

      // Send WhatsApp Notification
      if (user.phoneNumber && user.notifyViaWhatsApp === true && whatsappService.isConfigured()) {
        const whatsappResult = await whatsappService.sendContestReminder(
          user.phoneNumber,
          contest,
          reminder.reminderTime
        );
        results.whatsapp = { sent: whatsappResult.success, messageId: whatsappResult.messageId };
        
        if (whatsappResult.success) {
          logger.info(`WhatsApp notification sent for contest ${contest.id} to user ${user.id}`);
        }
      }

      // Mark reminder as notified if at least one channel succeeded
      if (results.push.sent || results.whatsapp.sent) {
        await reminderService.markAsNotified(reminder.id);
        logger.info(`Multi-channel reminder sent for contest ${contest.id} to user ${user.id}`);
      }

      return {
        success: results.push.sent || results.whatsapp.sent,
        channels: results,
      };
    } catch (error) {
      logger.error('Error sending contest reminder:', error);
      return { success: false, error: error.message };
    }
  }

  // Process pending reminders and send notifications
  async processPendingReminders() {
    try {
      const pendingReminders = await reminderService.getPendingReminders();

      // Only log if there are reminders to process
      if (pendingReminders.length > 0) {
        logger.info(`Processing ${pendingReminders.length} pending reminders`);
      }

      const results = {
        total: pendingReminders.length,
        success: 0,
        failed: 0,
      };

      for (const reminder of pendingReminders) {
        const result = await this.sendContestReminder(reminder);

        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }

        // Add small delay to avoid overwhelming FCM
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Only log summary if reminders were processed
      if (pendingReminders.length > 0) {
        logger.info(`Reminder processing complete. Success: ${results.success}, Failed: ${results.failed}`);
      }

      return results;
    } catch (error) {
      logger.error('Error processing pending reminders:', error);
      throw error;
    }
  }

  // Send custom notification to user
  async sendCustomNotification(userId, fcmToken, title, body, data = {}) {
    try {
      const notification = { title, body };

      const result = await this.sendPushNotification(fcmToken, notification, data);

      logger.info(`Custom notification sent to user ${userId}`);

      return result;
    } catch (error) {
      logger.error('Error sending custom notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send daily summary notification
  async sendDailySummary(user, upcomingContests) {
    if (!user.fcmToken || !user.notificationEnabled) {
      throw new BadRequestError('Notifications disabled or no FCM token');
    }

    const contestCount = upcomingContests.length;

    if (contestCount === 0) {
      logger.debug('No upcoming contests for daily summary');
      return { success: false, message: 'No upcoming contests' };
    }

    try {

      const notification = {
        title: `Daily Contest Summary 📊`,
        body: `You have ${contestCount} contest${contestCount > 1 ? 's' : ''} coming up today!`,
      };

      const data = {
        type: 'daily_summary',
        contestCount: contestCount.toString(),
      };

      return await this.sendPushNotification(user.fcmToken, notification, data);
    } catch (error) {
      logger.error('Error sending daily summary:', error);
      throw error; // Re-throw to let caller handle
    }
  }
}

module.exports = new NotificationService();
