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
      include: {
        linkedPlatforms: {
          where: { isActive: true },
        },
      },
      omit: {
        password: true,
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
      'avatar',
      'timezone',
      'notificationEnabled',
      'notificationTime',
      'darkMode',
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
      omit: {
        password: true,
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

  // Unlink platform account
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

    await prisma.linkedPlatform.delete({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    // Also delete associated stats
    await prisma.userStats.deleteMany({
      where: {
        userId,
        platform,
      },
    });

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

  // Delete user account
  async deleteAccount(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Soft delete - deactivate account
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

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
}

module.exports = new UserService();
