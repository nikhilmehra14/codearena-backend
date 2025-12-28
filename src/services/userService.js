const { prisma } = require('../config/database');
const { NotFoundError, ConflictError } = require('../utils/errorHandler');
const { cacheSet, cacheGet, cacheDel } = require('../config/redis');
const logger = require('../utils/logger');

class UserService {
  // Get user profile
  async getUserProfile(userId) {
    const cacheKey = `user:${userId}`;
    const cachedData = await cacheGet(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        avatar: true,
        phoneNumber: true,
        country: true,
        timezone: true,
        notificationEnabled: true,
        notificationTime: true,
        darkMode: true,
        preferredPlatforms: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        linkedPlatforms: {
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await cacheSet(cacheKey, user, 600);

    return user;
  }

  // Update user profile
  async updateUserProfile(userId, updates) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if username is being changed and if it's already taken
    if (updates.username && updates.username !== user.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: updates.username },
      });

      if (existingUser) {
        throw new ConflictError('Username already taken');
      }
    }

    // Update allowed fields
    const allowedFields = [
      'username',
      'fullName',
      'bio',
      'avatar',
      'phoneNumber',
      'country',
      'timezone',
      'notificationEnabled',
      'notificationTime',
      'darkMode',
      'preferredPlatforms',
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        avatar: true,
        phoneNumber: true,
        country: true,
        timezone: true,
        notificationEnabled: true,
        notificationTime: true,
        darkMode: true,
        preferredPlatforms: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Clear cache
    await cacheDel(`user:${userId}`);

    logger.info(`User profile updated: ${userId}`);

    return updatedUser;
  }

  // Link platform account
  async linkPlatform(userId, platform, platformUsername) {
    // Check if platform is already linked
    const existingLink = await prisma.linkedPlatform.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    if (existingLink) {
      throw new ConflictError('Platform already linked');
    }

    // Create linked platform
    const linkedPlatform = await prisma.linkedPlatform.create({
      data: {
        userId,
        platform,
        platformUsername,
        isVerified: false,
      },
    });

    // Clear cache
    await cacheDel(`user:${userId}`);

    logger.info(`Platform ${platform} linked for user ${userId}`);

    return linkedPlatform;
  }

  // Unlink platform account (with transaction)
  async unlinkPlatform(userId, platform) {
    const linkedPlatform = await prisma.linkedPlatform.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    if (!linkedPlatform) {
      throw new NotFoundError('Platform not linked');
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction([
      prisma.linkedPlatform.delete({
        where: {
          userId_platform: {
            userId,
            platform,
          },
        },
      }),
      prisma.userStats.deleteMany({
        where: {
          userId,
          platform,
        },
      }),
    ]);

    // Clear cache
    await cacheDel(`user:${userId}`);
    await cacheDel(`stats:${userId}:${platform}`);

    logger.info(`Platform ${platform} unlinked for user ${userId}`);

    return true;
  }

  // Get linked platforms
  async getLinkedPlatforms(userId) {
    const platforms = await prisma.linkedPlatform.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return platforms;
  }

  // Update platform username
  async updatePlatformUsername(userId, platform, platformUsername) {
    const linkedPlatform = await prisma.linkedPlatform.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    if (!linkedPlatform) {
      throw new NotFoundError('Platform not linked');
    }

    const updatedPlatform = await prisma.linkedPlatform.update({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
      data: {
        platformUsername,
        isVerified: false,
      },
    });

    // Clear cache
    await cacheDel(`user:${userId}`);
    await cacheDel(`stats:${userId}:${platform}`);

    logger.info(`Platform username updated for ${platform}, user ${userId}`);

    return updatedPlatform;
  }

  // Delete user account (soft delete with transaction)
  async deleteAccount(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Soft delete - deactivate account and related data atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      }),
      prisma.reminder.updateMany({
        where: { userId },
        data: { isActive: false },
      }),
    ]);

    // Clear cache
    await cacheDel(`user:${userId}`);

    logger.info(`User account deactivated: ${userId}`);

    return true;
  }

  // Get user dashboard stats
  async getUserDashboard(userId) {
    const user = await this.getUserProfile(userId);

    const linkedPlatforms = await prisma.linkedPlatform.count({
      where: { userId, isActive: true },
    });

    const activeReminders = await prisma.reminder.count({
      where: {
        userId,
        isActive: true,
        notificationSent: false,
      },
    });

    return {
      user,
      stats: {
        linkedPlatforms,
        activeReminders,
      },
    };
  }

  // Get active sessions for user
  async getActiveSessions(userId) {
    // Get all active refresh tokens for this user
    const refreshTokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gte: new Date() }, // Only non-expired tokens
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get corresponding login activities
    const sessions = await Promise.all(
      refreshTokens.map(async (token) => {
        // Find the most recent login activity for this device
        const loginActivity = await prisma.loginActivity.findFirst({
          where: {
            userId,
            deviceInfo: token.deviceInfo,
          },
          orderBy: {
            loginAt: 'desc',
          },
        });

        return {
          id: token.id,
          device: token.deviceInfo || 'Unknown Device',
          browser: loginActivity?.browser || 'Unknown',
          os: loginActivity?.os || 'Unknown',
          ipAddress: loginActivity?.ipAddress || 'Unknown',
          location: this.getLocationFromIP(loginActivity?.ipAddress),
          lastActive: token.createdAt,
          createdAt: token.createdAt,
        };
      })
    );

    return sessions;
  }

  // Helper to get location from IP (placeholder - can integrate with IP geolocation service)
  getLocationFromIP(ipAddress) {
    if (!ipAddress) return 'Unknown';
    // TODO: Integrate with IP geolocation service like ipapi.co or ip-api.com
    // For now, return a placeholder
    return 'Unknown Location';
  }

  // Logout specific session
  async logoutSession(userId, sessionId) {
    const refreshToken = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!refreshToken) {
      throw new NotFoundError('Session not found');
    }

    // Revoke the refresh token
    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    logger.info(`Session ${sessionId} logged out for user ${userId}`);

    return true;
  }

  // Logout all sessions except current
  async logoutAllSessions(userId, currentTokenId = null) {
    const where = {
      userId,
      isRevoked: false,
    };

    // If currentTokenId is provided, exclude it
    if (currentTokenId) {
      where.id = { not: currentTokenId };
    }

    // Revoke all refresh tokens except current
    await prisma.refreshToken.updateMany({
      where,
      data: { isRevoked: true },
    });

    logger.info(`All sessions logged out for user ${userId} (except current)`);

    return true;
  }
}

module.exports = new UserService();
