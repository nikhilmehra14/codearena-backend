const axios = require('axios');
const { prisma } = require('../config/database');
const { NotFoundError } = require('../utils/errorHandler');
const { cacheGet, cacheSet } = require('../config/redis');
const config = require('../config/config');
const logger = require('../utils/logger');

class StatsService {
  // Fetch stats from Codeforces
  async fetchCodeforcesStats(username) {
    try {
      const userInfoUrl = `${config.externalAPIs.codeforces.base}/user.info?handles=${username}`;
      const response = await axios.get(userInfoUrl, { timeout: 10000 });

      if (response.data.status !== 'OK') {
        throw new Error('Failed to fetch Codeforces data');
      }

      const userData = response.data.result[0];

      return {
        rating: userData.rating || 0,
        maxRating: userData.maxRating || 0,
        globalRank: userData.rank || null,
        countryRank: null,
        problemsSolved: 0, // Requires additional API call
        contestsParticipated: 0,
        statsData: {
          handle: userData.handle,
          contribution: userData.contribution,
          friendOfCount: userData.friendOfCount,
          titlePhoto: userData.titlePhoto,
        },
      };
    } catch (error) {
      logger.error(`Error fetching Codeforces stats for ${username}:`, error.message);
      throw new Error('Failed to fetch Codeforces stats');
    }
  }

  // Fetch stats from LeetCode (Note: LeetCode doesn't have official API)
  async fetchLeetCodeStats(username) {
    try {
      // Using GraphQL query
      const query = `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              ranking
              reputation
            }
            submitStats {
              acSubmissionNum {
                difficulty
                count
              }
            }
            userContestRanking {
              attendedContestsCount
              rating
              globalRanking
              topPercentage
            }
          }
        }
      `;

      const response = await axios.post(
        config.externalAPIs.leetcode.base,
        {
          query,
          variables: { username },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Referer: 'https://leetcode.com',
          },
          timeout: 10000,
        }
      );

      const userData = response.data.data.matchedUser;

      if (!userData) {
        throw new Error('User not found on LeetCode');
      }

      const problemsSolved = userData.submitStats?.acSubmissionNum?.reduce(
        (sum, item) => sum + item.count,
        0
      ) || 0;

      return {
        rating: Math.round(userData.userContestRanking?.rating || 0),
        maxRating: Math.round(userData.userContestRanking?.rating || 0),
        globalRank: userData.userContestRanking?.globalRanking || null,
        countryRank: null,
        problemsSolved,
        contestsParticipated: userData.userContestRanking?.attendedContestsCount || 0,
        statsData: {
          ranking: userData.profile?.ranking || null,
          reputation: userData.profile?.reputation || 0,
          topPercentage: userData.userContestRanking?.topPercentage || null,
        },
      };
    } catch (error) {
      logger.error(`Error fetching LeetCode stats for ${username}:`, error.message);
      throw new Error('Failed to fetch LeetCode stats');
    }
  }

  // Fetch stats from CodeChef (Basic implementation)
  async fetchCodeChefStats(username) {
    try {
      // Note: CodeChef API requires authentication
      // This is a placeholder implementation
      return {
        rating: 0,
        maxRating: 0,
        globalRank: null,
        countryRank: null,
        problemsSolved: 0,
        contestsParticipated: 0,
        statsData: {
          username,
          note: 'CodeChef API integration requires authentication',
        },
      };
    } catch (error) {
      logger.error(`Error fetching CodeChef stats for ${username}:`, error.message);
      throw new Error('Failed to fetch CodeChef stats');
    }
  }

  // Fetch stats from AtCoder
  async fetchAtCoderStats(username) {
    try {
      // AtCoder doesn't have an official API
      // This is a placeholder implementation
      return {
        rating: 0,
        maxRating: 0,
        globalRank: null,
        countryRank: null,
        problemsSolved: 0,
        contestsParticipated: 0,
        statsData: {
          username,
          note: 'AtCoder stats require web scraping',
        },
      };
    } catch (error) {
      logger.error(`Error fetching AtCoder stats for ${username}:`, error.message);
      throw new Error('Failed to fetch AtCoder stats');
    }
  }

  // Get stats for a specific platform
  async getPlatformStats(userId, platform) {
    const cacheKey = `stats:${userId}:${platform}`;
    const cachedData = await cacheGet(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    // Get linked platform
    const linkedPlatform = await prisma.linkedPlatform.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
        isActive: true,
      },
    });

    if (!linkedPlatform) {
      throw new NotFoundError('Platform not linked');
    }

    // Get or create stats record
    let stats = await prisma.userStats.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    // If stats don't exist or are outdated (more than 1 hour), fetch new stats
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (!stats || !stats.lastFetched || stats.lastFetched < oneHourAgo) {
      try {
        // Fetch fresh stats
        let platformStats;

        switch (platform) {
          case 'codeforces':
            platformStats = await this.fetchCodeforcesStats(linkedPlatform.platformUsername);
            break;
          case 'leetcode':
            platformStats = await this.fetchLeetCodeStats(linkedPlatform.platformUsername);
            break;
          case 'codechef':
            platformStats = await this.fetchCodeChefStats(linkedPlatform.platformUsername);
            break;
          case 'atcoder':
            platformStats = await this.fetchAtCoderStats(linkedPlatform.platformUsername);
            break;
          default:
            throw new Error('Unsupported platform');
        }

        // Update or create stats
        stats = await prisma.userStats.upsert({
          where: {
            userId_platform: {
              userId,
              platform,
            },
          },
          update: {
            ...platformStats,
            lastFetched: new Date(),
          },
          create: {
            userId,
            platform,
            ...platformStats,
            lastFetched: new Date(),
          },
        });

        // Mark platform as verified
        if (!linkedPlatform.isVerified) {
          await prisma.linkedPlatform.update({
            where: {
              userId_platform: {
                userId,
                platform,
              },
            },
            data: {
              isVerified: true,
              lastSynced: new Date(),
            },
          });
        }
      } catch (error) {
        logger.error(`Error fetching stats for ${platform}:`, error);
        
        // Return existing stats if available
        if (stats) {
          await cacheSet(cacheKey, stats, config.cache.statsTTL);
          return stats;
        }
        
        throw error;
      }
    }

    // Cache the stats
    await cacheSet(cacheKey, stats, config.cache.statsTTL);

    return stats;
  }

  // Get all stats for user
  async getAllUserStats(userId) {
    const linkedPlatforms = await prisma.linkedPlatform.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    const statsPromises = linkedPlatforms.map(async (lp) => {
      try {
        const stats = await this.getPlatformStats(userId, lp.platform);
        return {
          platform: lp.platform,
          username: lp.platformUsername,
          stats,
        };
      } catch (error) {
        logger.error(`Error fetching stats for ${lp.platform}:`, error);
        return {
          platform: lp.platform,
          username: lp.platformUsername,
          stats: null,
          error: error.message,
        };
      }
    });

    const results = await Promise.all(statsPromises);

    return results;
  }

  // Force sync stats for a platform
  async syncPlatformStats(userId, platform) {
    const linkedPlatform = await prisma.linkedPlatform.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
        isActive: true,
      },
    });

    if (!linkedPlatform) {
      throw new NotFoundError('Platform not linked');
    }

    // Fetch fresh stats
    let platformStats;

    switch (platform) {
      case 'codeforces':
        platformStats = await this.fetchCodeforcesStats(linkedPlatform.platformUsername);
        break;
      case 'leetcode':
        platformStats = await this.fetchLeetCodeStats(linkedPlatform.platformUsername);
        break;
      case 'codechef':
        platformStats = await this.fetchCodeChefStats(linkedPlatform.platformUsername);
        break;
      case 'atcoder':
        platformStats = await this.fetchAtCoderStats(linkedPlatform.platformUsername);
        break;
      default:
        throw new Error('Unsupported platform');
    }

    // Update or create stats
    const stats = await prisma.userStats.upsert({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
      update: {
        ...platformStats,
        lastFetched: new Date(),
      },
      create: {
        userId,
        platform,
        ...platformStats,
        lastFetched: new Date(),
      },
    });

    // Update linked platform
    await prisma.linkedPlatform.update({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
      data: {
        isVerified: true,
        lastSynced: new Date(),
      },
    });

    // Update cache
    const cacheKey = `stats:${userId}:${platform}`;
    await cacheSet(cacheKey, stats, config.cache.statsTTL);

    logger.info(`Stats synced for ${platform}, user ${userId}`);

    return stats;
  }

  // Get user's overall stats summary
  async getUserStatsSummary(userId) {
    const allStats = await this.getAllUserStats(userId);

    const summary = {
      totalPlatforms: allStats.length,
      totalRating: 0,
      totalProblemsSolved: 0,
      totalContests: 0,
      platforms: allStats,
    };

    allStats.forEach((platformData) => {
      if (platformData.stats) {
        summary.totalRating += platformData.stats.rating || 0;
        summary.totalProblemsSolved += platformData.stats.problemsSolved || 0;
        summary.totalContests += platformData.stats.contestsParticipated || 0;
      }
    });

    return summary;
  }
}

module.exports = new StatsService();
