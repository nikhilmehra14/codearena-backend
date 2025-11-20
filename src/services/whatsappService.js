const twilio = require('twilio');
const logger = require('../utils/logger');
const config = require('../config/config');

class WhatsAppService {
  constructor() {
    // Check if Twilio credentials are properly configured (not placeholder values)
    const isValidTwilioConfig = 
      config.whatsapp.provider === 'twilio' &&
      config.whatsapp.twilio.accountSid &&
      config.whatsapp.twilio.accountSid.startsWith('AC') && // Valid Twilio Account SID format
      config.whatsapp.twilio.authToken &&
      !config.whatsapp.twilio.accountSid.includes('your_') && // Not placeholder
      !config.whatsapp.twilio.authToken.includes('your_'); // Not placeholder

    if (isValidTwilioConfig) {
      try {
        this.client = twilio(
          config.whatsapp.twilio.accountSid,
          config.whatsapp.twilio.authToken
        );
        this.fromNumber = config.whatsapp.twilio.fromNumber;
        logger.info('✅ WhatsApp service initialized (Twilio)');
      } catch (error) {
        this.client = null;
        logger.warn('⚠️ WhatsApp service initialization failed:', error.message);
      }
    } else {
      this.client = null;
      logger.warn('⚠️ WhatsApp service not configured - email notifications will be used');
    }
  }

  // Check if WhatsApp is configured
  isConfigured() {
    return this.client !== null;
  }

  // Send contest reminder via WhatsApp
  async sendContestReminder(phoneNumber, contest, notificationTime) {
    if (!this.isConfigured()) {
      logger.warn('WhatsApp not configured, skipping message');
      return { success: false, reason: 'not_configured' };
    }

    try {
      const message = this.buildContestReminderMessage(contest, notificationTime);
      
      const result = await this.client.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${phoneNumber}`,
        body: message,
      });

      logger.info(`WhatsApp sent to ${phoneNumber}: ${result.sid}`);
      
      return {
        success: true,
        messageId: result.sid,
        status: result.status,
      };
    } catch (error) {
      logger.error('WhatsApp send error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send bulk WhatsApp notifications
  async sendBulkNotifications(notifications) {
    if (!this.isConfigured()) {
      return { success: false, sent: 0, failed: 0 };
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const notification of notifications) {
      try {
        const result = await this.sendContestReminder(
          notification.phoneNumber,
          notification.contest,
          notification.notificationTime
        );

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            phoneNumber: notification.phoneNumber,
            error: result.error || result.reason,
          });
        }

        // Rate limiting: Twilio allows ~1 message per second
        await this.sleep(1000);
      } catch (error) {
        results.failed++;
        results.errors.push({
          phoneNumber: notification.phoneNumber,
          error: error.message,
        });
      }
    }

    logger.info(`WhatsApp bulk send: ${results.sent} sent, ${results.failed} failed`);
    return results;
  }

  // Build contest reminder message
  buildContestReminderMessage(contest, notificationTime) {
    const contestDate = new Date(contest.startTime);
    const formattedDate = contestDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = contestDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `🚀 *Contest Reminder from CodeArena*

📌 *${contest.name}*
🏆 Platform: ${contest.platform.toUpperCase()}
⏰ Starts: ${formattedDate} at ${formattedTime}
⏳ Starting in ${notificationTime} minutes!

🔗 Link: ${contest.url}

Good luck! 💪`;
  }

  // Send test WhatsApp message
  async sendTestMessage(phoneNumber) {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp service not configured');
    }

    try {
      const result = await this.client.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${phoneNumber}`,
        body: '✅ WhatsApp notifications are working! You will receive contest reminders on this number.',
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      logger.error('WhatsApp test message error:', error);
      throw error;
    }
  }

  // Format phone number to E.164 format (+country_code)
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Add + if not present
    if (!phoneNumber.startsWith('+')) {
      // Assume country code based on length
      if (cleaned.length === 10) {
        // Assume India, add +91 (change to +1 for US)
        cleaned = `+91${cleaned}`;
      } else if (cleaned.length === 12) {
        cleaned = `+${cleaned}`;
      } else if (cleaned.length === 11) {
        cleaned = `+${cleaned}`;
      }
    } else {
      cleaned = phoneNumber;
    }

    return cleaned;
  }

  // Validate phone number format (E.164)
  isValidPhoneNumber(phoneNumber) {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  // Helper: Sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WhatsAppService();
