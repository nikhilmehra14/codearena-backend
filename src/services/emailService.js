const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      if (!config.email.host || !config.email.user) {
        logger.warn('⚠️ Email service not configured - email features will be disabled');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });

      logger.info('✓ Email service initialized successfully');
    } catch (error) {
      logger.error('✗ Email service initialization failed:', error);
    }
  }

  isConfigured() {
    return this.transporter !== null;
  }

  async sendOTPEmail(email, otp, username) {
    if (!this.isConfigured()) {
      logger.warn('Email service not configured, cannot send OTP');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: `"${config.email.fromName}" <${config.email.from}>`,
        to: email,
        subject: 'Verify Your Email - CodeArena',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
              .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { color: #e74c3c; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 Welcome to CodeArena!</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${username}</strong>,</p>
                <p>Thank you for registering with CodeArena! To complete your registration and start receiving contest notifications, please verify your email address.</p>
                
                <div class="otp-box">
                  <p style="margin: 0; color: #666;">Your verification code is:</p>
                  <div class="otp-code">${otp}</div>
                  <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Valid for 10 minutes</p>
                </div>

                <p>Enter this code in the app to verify your email and activate your account.</p>
                
                <p class="warning">⚠️ If you didn't create an account with CodeArena, please ignore this email.</p>
                
                <p>Happy coding!<br>The CodeArena Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>&copy; ${new Date().getFullYear()} CodeArena. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Welcome to CodeArena!
          
          Hi ${username},
          
          Your email verification code is: ${otp}
          
          This code is valid for 10 minutes.
          
          Enter this code in the app to verify your email and activate your account.
          
          If you didn't create an account with CodeArena, please ignore this email.
          
          Happy coding!
          The CodeArena Team
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`OTP email sent to ${email}`);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, username) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: `"${config.email.fromName}" <${config.email.from}>`,
        to: email,
        subject: 'Welcome to CodeArena! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome to CodeArena!</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${username}</strong>,</p>
                <p>Your email has been verified successfully! You're all set to start your competitive programming journey with CodeArena.</p>
                
                <h3>🚀 What you can do now:</h3>
                
                <div class="feature">
                  <strong>📅 Track Contests</strong><br>
                  Get upcoming contests from LeetCode, Codeforces, CodeChef, AtCoder, and more!
                </div>
                
                <div class="feature">
                  <strong>🔔 Set Reminders</strong><br>
                  Never miss a contest with customizable notifications via Push, WhatsApp, or Email.
                </div>
                
                <div class="feature">
                  <strong>📊 View Stats</strong><br>
                  Track your performance across different platforms in one place.
                </div>
                
                <div class="feature">
                  <strong>🔗 Link Platforms</strong><br>
                  Connect your coding platform accounts to sync stats automatically.
                </div>
                
                <p>Start exploring and happy coding!</p>
                
                <p>Best regards,<br>The CodeArena Team</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} CodeArena. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Welcome email sent to ${email}`);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(email, resetToken, username) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const resetUrl = `${config.urls.frontend}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"${config.email.fromName}" <${config.email.from}>`,
        to: email,
        subject: 'Reset Your Password - CodeArena',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .warning { color: #e74c3c; font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔒 Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${username}</strong>,</p>
                <p>We received a request to reset your password for your CodeArena account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:<br>
                ${resetUrl}</p>
                
                <p><strong>This link will expire in 1 hour.</strong></p>
                
                <p class="warning">⚠️ If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
                
                <p>Best regards,<br>The CodeArena Team</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} CodeArena. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Password reset email sent to ${email}`);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
