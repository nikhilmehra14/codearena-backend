const { prisma } = require('../config/database');
const bcrypt = require('bcryptjs');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../middleware/auth');
const { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } = require('../utils/errorHandler');
const { cacheSet, cacheDel, cacheDelPattern, cacheGet } = require('../config/redis');
const logger = require('../utils/logger');
const emailService = require('./emailService');
const { addOTPEmailJob, addWelcomeEmailJob } = require('../queues/emailQueue');
const IPUtils = require('../utils/ipUtils');
const UserAgentParser = require('../utils/userAgentParser');

// Helper function to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

class AuthService {
  // Check username availability (optimized with caching)
  async checkUsernameAvailability(username) {
    const normalizedUsername = username.toLowerCase().trim();

    // Check Redis cache first (TTL: 5 minutes)
    const cacheKey = `username:check:${normalizedUsername}`;
    const cached = await cacheGet(cacheKey);

    if (cached !== null) {
      logger.debug(`Username check cache hit: ${normalizedUsername}`);
      return cached === 'available';
    }

    // Use Prisma's count for optimized query (faster than findUnique)
    const count = await prisma.user.count({
      where: {
        username: {
          equals: normalizedUsername,
          mode: 'insensitive', // Case-insensitive
        },
      },
    });

    const isAvailable = count === 0;

    // Cache the result (5 minutes)
    await cacheSet(cacheKey, isAvailable ? 'available' : 'taken', 300);

    logger.debug(`Username availability: ${normalizedUsername} - ${isAvailable ? 'available' : 'taken'}`);

    return isAvailable;
  }

  // Check email availability (optimized with caching)
  async checkEmailAvailability(email) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check Redis cache first
    const cacheKey = `email:check:${normalizedEmail}`;
    const cached = await cacheGet(cacheKey);

    if (cached !== null) {
      logger.debug(`Email check cache hit: ${normalizedEmail}`);
      return cached === 'available';
    }

    // Use count for optimized query
    const count = await prisma.user.count({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    const isAvailable = count === 0;

    // Cache the result (5 minutes)
    await cacheSet(cacheKey, isAvailable ? 'available' : 'taken', 300);

    logger.debug(`Email availability: ${normalizedEmail} - ${isAvailable ? 'available' : 'taken'}`);

    return isAvailable;
  }

  // Register new user
  async register(userData) {
    const { email, username, password, fullName } = userData;

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    // Hash password before transaction
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();

    let user;

    try {
      // Use transaction to handle race conditions atomically
      user = await prisma.$transaction(async (tx) => {
        // Check if user already exists
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          // If user exists but is not verified, delete and allow re-registration
          if (!existingUser.isVerified) {
            await tx.user.delete({
              where: { id: existingUser.id },
            });
            logger.info(`Deleted unverified account for re-registration: ${normalizedEmail}`);
          } else {
            throw new ConflictError('Email already registered');
          }
        }

        const existingUsername = await tx.user.findUnique({
          where: { username: normalizedUsername },
        });

        if (existingUsername) {
          // If username exists but is not verified, delete and allow re-registration
          if (!existingUsername.isVerified) {
            await tx.user.delete({
              where: { id: existingUsername.id },
            });
            logger.info(`Deleted unverified account for re-registration: ${normalizedUsername}`);
          } else {
            throw new ConflictError('Username already taken');
          }
        }

        // Create new user (unverified) within the same transaction
        return await tx.user.create({
          data: {
            email: normalizedEmail,
            username: normalizedUsername,
            password: hashedPassword,
            fullName,
            authProvider: 'local',
            isVerified: false,
          },
        });
      });
    } catch (error) {
      // Handle Prisma unique constraint violations (race condition fallback)
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target && target.includes('email')) {
          throw new ConflictError('Email already registered');
        } else if (target && target.includes('username')) {
          throw new ConflictError('Username already taken');
        }
      }
      // Re-throw if it's our custom error or unknown error
      throw error;
    }

    // Store OTP in Redis with 10-minute expiration
    const otpKey = `otp:${normalizedEmail}`;
    await cacheSet(otpKey, otp, 600); // 600 seconds = 10 minutes

    // Add OTP email to queue (non-blocking)
    try {
      await addOTPEmailJob(normalizedEmail, otp, username);
      logger.info(`OTP email job queued for ${normalizedEmail}`);
    } catch (error) {
      logger.error(`Failed to queue OTP email for ${normalizedEmail}:`, error);
      // Continue with registration even if email queue fails
    }

    // Invalidate cache for this username and email
    await cacheDel(`username:check:${normalizedUsername}`);
    await cacheDel(`email:check:${normalizedEmail}`);

    // Remove sensitive data from response
    delete user.password;

    logger.info(`New user registered (unverified): ${normalizedEmail}`);

    return {
      user,
      message: 'Registration successful. Please check your email for OTP verification.',
      requiresVerification: true,
    };
  }

  // Login user
  async login(email, password, ip = null, userAgent = null) {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Check email verification
    if (!user.isVerified) {
      throw new UnauthorizedError('Please verify your email before logging in. Check your inbox for the OTP.');
    }

    // Check password
    if (!user.password) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Track login activity
    await this.trackLoginActivity(user.id, ip, userAgent);

    // Remove password from response
    delete user.password;

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token to database
    await this.saveRefreshToken(user.id, refreshToken, userAgent);

    logger.info(`User logged in: ${normalizedEmail}`);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  // OAuth login/register
  async oauthLogin(profile, provider) {
    const { id: providerId, email, displayName, photos } = profile;

    let user = await prisma.user.findFirst({
      where: {
        authProvider: provider,
        authProviderId: providerId,
      },
    });

    // If user doesn't exist, check by email
    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } });

      // Update existing user with OAuth info
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            authProvider: provider,
            authProviderId: providerId,
            isVerified: true,
            avatar: !user.avatar && photos && photos.length > 0 ? photos[0].value : user.avatar,
          },
        });
      }
    }

    // Create new user if doesn't exist
    if (!user) {
      const username = email?.split('@')[0] || `${provider}_${providerId}`;

      user = await prisma.user.create({
        data: {
          email: email || `${providerId}@${provider}.oauth`,
          username: await this.generateUniqueUsername(username),
          fullName: displayName,
          authProvider: provider,
          authProviderId: providerId,
          isVerified: true,
          avatar: photos && photos.length > 0 ? photos[0].value : null,
        },
      });

      logger.info(`New OAuth user created: ${email} via ${provider}`);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    await this.saveRefreshToken(user.id, refreshToken);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        isRevoked: false,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedError('Refresh token expired');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id);

    return {
      accessToken,
    };
  }

  // Logout user
  async logout(userId, refreshToken) {
    // Revoke refresh token
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        token: refreshToken,
      },
      data: {
        isRevoked: true,
      },
    });

    // Clear user cache
    await cacheDel(`user:${userId}`);

    logger.info(`User logged out: ${userId}`);
  }

  // Save refresh token to database
  async saveRefreshToken(userId, token, deviceInfo = null) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
        deviceInfo,
      },
    });
  }

  // Generate unique username
  async generateUniqueUsername(baseUsername) {
    let username = baseUsername.toLowerCase().trim();
    let counter = 1;

    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  // Update FCM token
  async updateFCMToken(userId, fcmToken) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });

    delete updatedUser.password;

    logger.info(`FCM token updated for user: ${userId}`);

    return updatedUser;
  }

  // Update phone number
  async updatePhoneNumber(userId, phoneNumber) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { phoneNumber },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phoneNumber: true,
        notifyViaWhatsApp: true,
      },
    });

    logger.info(`Phone number updated for user: ${userId}`);
    return updatedUser;
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData = {};
    if (preferences.notifyViaPush !== undefined) {
      updateData.notifyViaPush = preferences.notifyViaPush;
    }
    if (preferences.notifyViaWhatsApp !== undefined) {
      updateData.notifyViaWhatsApp = preferences.notifyViaWhatsApp;
    }
    if (preferences.notifyViaEmail !== undefined) {
      updateData.notifyViaEmail = preferences.notifyViaEmail;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        notifyViaPush: true,
        notifyViaWhatsApp: true,
        notifyViaEmail: true,
      },
    });

    logger.info(`Notification preferences updated for user: ${userId}`);
    return updatedUser;
  }

  // Verify OTP
  async verifyOTP(email, otp, ip = null, userAgent = null) {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email (select only needed fields for faster query)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        isVerified: true,
        isActive: true,
        avatar: true,
        authProvider: true,
        notifyViaPush: true,
        notifyViaWhatsApp: true,
        notifyViaEmail: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if already verified
    if (user.isVerified) {
      throw new BadRequestError('Email already verified');
    }

    // Get OTP from Redis
    const otpKey = `otp:${normalizedEmail}`;
    const storedOTP = await cacheGet(otpKey);

    // Check if OTP exists
    if (!storedOTP) {
      throw new BadRequestError('OTP expired or not found. Please request a new one.');
    }

    // Verify OTP
    if (storedOTP !== otp) {
      throw new BadRequestError('Invalid OTP');
    }

    // Mark user as verified, update lastLogin, and delete OTP in parallel
    const [verifiedUser] = await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          lastLogin: new Date(),
        },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          isVerified: true,
          isActive: true,
          avatar: true,
          authProvider: true,
          notifyViaPush: true,
          notifyViaWhatsApp: true,
          notifyViaEmail: true,
          createdAt: true,
        },
      }),
      cacheDel(otpKey),
    ]);

    // Send welcome email asynchronously (non-blocking)
    try {
      await addWelcomeEmailJob(normalizedEmail, verifiedUser.username);
      logger.info(`Welcome email job queued for ${normalizedEmail}`);
    } catch (error) {
      logger.error(`Failed to queue welcome email for ${normalizedEmail}:`, error);
      // Continue even if email queue fails
    }

    // Generate tokens
    const accessToken = generateAccessToken(verifiedUser.id);
    const refreshToken = generateRefreshToken(verifiedUser.id);

    // Save refresh token with device info
    await this.saveRefreshToken(verifiedUser.id, refreshToken, userAgent);

    // Track login activity for OTP verification
    await this.trackLoginActivity(verifiedUser.id, ip, userAgent);

    logger.info(`User email verified: ${normalizedEmail}`);

    return {
      user: verifiedUser,
      accessToken,
      refreshToken,
      message: 'Email verified successfully',
    };
  }

  // Resend OTP
  async resendOTP(email) {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if already verified
    if (user.isVerified) {
      throw new BadRequestError('Email already verified');
    }

    // Rate limiting: Check if OTP was sent recently (within 1 minute)
    const rateLimitKey = `otp:ratelimit:${normalizedEmail}`;
    const lastSent = await cacheGet(rateLimitKey);

    if (lastSent) {
      const waitTime = 60 - Math.floor((Date.now() - parseInt(lastSent)) / 1000);
      if (waitTime > 0) {
        throw new BadRequestError(`Please wait ${waitTime} seconds before requesting a new OTP`);
      }
    }

    // Generate new OTP
    const otp = generateOTP();

    // Store OTP in Redis with 10-minute expiration
    const otpKey = `otp:${normalizedEmail}`;
    await cacheSet(otpKey, otp, 600); // 600 seconds = 10 minutes

    // Set rate limit timestamp with 60-second expiration
    await cacheSet(rateLimitKey, Date.now().toString(), 60);

    // Add OTP email to queue (non-blocking)
    try {
      await addOTPEmailJob(normalizedEmail, otp, user.username);
      logger.info(`OTP email job queued for ${normalizedEmail}`);
    } catch (error) {
      logger.error(`Failed to queue OTP email for ${normalizedEmail}:`, error);
      // Continue even if email queue fails
    }

    return {
      message: 'OTP has been resent. Please check your email.',
    };
  }

  // Forgot Password - Send reset token via email
  async forgotPassword(email) {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        authProvider: true,
      },
    });

    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return {
        message: 'If an account with this email exists, a password reset link has been sent.',
      };
    }

    // Check if account uses OAuth (no password)
    if (user.authProvider !== 'local') {
      logger.info(`Password reset requested for OAuth account: ${normalizedEmail}`);
      return {
        message: 'If an account with this email exists, a password reset link has been sent.',
      };
    }

    // Rate limiting: Check if reset was sent recently (within 2 minutes)
    const rateLimitKey = `password-reset:ratelimit:${normalizedEmail}`;
    const lastSent = await cacheGet(rateLimitKey);

    if (lastSent) {
      const waitTime = 120 - Math.floor((Date.now() - parseInt(lastSent)) / 1000);
      if (waitTime > 0) {
        throw new BadRequestError(`Please wait ${waitTime} seconds before requesting another password reset`);
      }
    }

    // Generate crypto-secure random token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token for storage
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token in Redis with 1-hour expiration
    const tokenKey = `password-reset:${hashedToken}`;
    await cacheSet(tokenKey, JSON.stringify({ userId: user.id, email: normalizedEmail }), 3600); // 1 hour

    // Set rate limit timestamp with 2-minute expiration
    await cacheSet(rateLimitKey, Date.now().toString(), 120);

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(normalizedEmail, resetToken, user.username);

      logger.info(`Password reset email sent to ${normalizedEmail}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${normalizedEmail}:`, error);
      // Continue even if email fails - don't expose this to user
    }

    return {
      message: 'If an account with this email exists, a password reset link has been sent.',
    };
  }

  // Reset Password - Verify token and update password
  async resetPassword(token, newPassword) {
    const crypto = require('crypto');

    // Hash the provided token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Get token data from Redis
    const tokenKey = `password-reset:${hashedToken}`;
    const tokenData = await cacheGet(tokenKey);

    if (!tokenData) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const { userId, email } = JSON.parse(tokenData);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if account uses OAuth
    if (user.authProvider !== 'local') {
      throw new BadRequestError('Cannot reset password for OAuth accounts');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and invalidate all refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }),
      // Revoke all existing refresh tokens for security
      prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      }),
    ]);

    // Delete the used token
    await cacheDel(tokenKey);

    // Clear any password reset rate limits
    await cacheDel(`password-reset:ratelimit:${email}`);

    // Clear user cache
    await cacheDel(`user:${userId}`);

    logger.info(`Password reset successful for user: ${email}`);

    return {
      message: 'Password has been reset successfully. Please login with your new password.',
    };
  }

  // Track login activity
  async trackLoginActivity(userId, ip, userAgent) {
    try {
      // Extract and normalize IP
      const ipAddress = ip ? IPUtils.normalizeIP(ip) : 'unknown';

      // Parse user agent
      const deviceData = UserAgentParser.parse(userAgent);

      // Save login activity
      await prisma.loginActivity.create({
        data: {
          userId,
          ipAddress,
          userAgent: userAgent || null,
          deviceInfo: deviceData.deviceInfo,
          browser: deviceData.browser,
          os: deviceData.os,
          loginAt: new Date(),
        },
      });

      logger.info(`Login activity tracked for user ${userId} from ${ipAddress}`);
    } catch (error) {
      // Don't fail login if activity tracking fails
      logger.error('Failed to track login activity:', error);
    }
  }

  // Get user login history
  async getLoginHistory(userId, limit = 10) {
    const activities = await prisma.loginActivity.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: limit,
      select: {
        id: true,
        ipAddress: true,
        deviceInfo: true,
        browser: true,
        os: true,
        loginAt: true,
      },
    });

    return activities;
  }
}

module.exports = new AuthService();
