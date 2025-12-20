const axios = require('axios');
const { prisma } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');
const { NotFoundError } = require('../utils/errorHandler');
const config = require('../config/config');
const logger = require('../utils/logger');
const { BATCH_SIZES } = require('../constants/database');

class ContestService {
  // Use platform logos from config
  get platformLogos() {
    return config.platformLogos;
  }

  // Platform mapping for Clist resource names to our platform enum
  platformMapping = {
    'leetcode.com': 'leetcode',
    'codeforces.com': 'codeforces',
    'codechef.com': 'codechef',
    'atcoder.jp': 'atcoder',
    'hackerrank.com': 'hackerrank',
    'hackerearth.com': 'hackerearth',
  };

  // Helper function to calculate duration between two dates
  calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationSeconds = Math.floor((end - start) / 1000);
    
    return durationSeconds;
  }

  // Get platform from Clist resource name
  getPlatformFromResource(resource) {
    return this.platformMapping[resource] || null;
  }

  // Fetch contests from Clist.by API
  async fetchContestsFromClist() {
    try {
      const { username, apiKey, base } = config.externalAPIs.clist;
      
      if (!username || !apiKey) {
        logger.warn('Clist API credentials not configured');
        return [];
      }

      // Get contests starting from now and in the next 30 days
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const response = await axios.get(`${base}/contest/`, {
        params: {
          username,
          api_key: apiKey,
          start__gt: now.toISOString(),
          end__lt: endDate.toISOString(),
          order_by: 'start',
          limit: 100,
        },
        timeout: 15000,
      });

      if (!response.data || !response.data.objects) {
        logger.warn('Invalid response from Clist API');
        return [];
      }

      const contests = response.data.objects
        .map(contest => {
          const platform = this.getPlatformFromResource(contest.resource);
          
          if (!platform) {
            return null; // Skip unsupported platforms
          }

          const startTime = new Date(contest.start);
          const endTime = new Date(contest.end);
          const durationSeconds = this.calculateDuration(contest.start, contest.end);

          return {
            platform,
            externalId: `clist_${contest.id}`,
            name: contest.event,
            startTimeUnix: Math.floor(startTime.getTime() / 1000),
            startTime,
            endTime,
            durationSeconds,
            url: contest.href || `https://${contest.resource}`,
            platformLogo: this.platformLogos[platform],
          };
        })
        .filter(contest => contest !== null); // Remove null entries

      logger.info(`Fetched ${contests.length} contests from Clist.by`);
      return contests;
    } catch (error) {
      logger.error('Error fetching contests from Clist:', error.message);
      return [];
    }
  }

  // Fetch Codeforces contests
  async fetchCodeforcesContests() {
    try {
      const response = await axios.get('https://codeforces.com/api/contest.list', {
        timeout: 10000,
      });
      
      if (response.data.status !== 'OK') {
        throw new Error('Failed to fetch Codeforces contests');
      }
      
      // Filter only active contests (phase === "BEFORE")
      const activeContests = response.data.result
        .filter(contest => contest.phase === 'BEFORE')
        .map(contest => ({
          platform: 'codeforces',
          externalId: `cf_${contest.id}`,
          name: contest.name,
          startTimeUnix: contest.startTimeSeconds,
          startTime: new Date(contest.startTimeSeconds * 1000),
          durationSeconds: contest.durationSeconds,
          endTime: new Date((contest.startTimeSeconds + contest.durationSeconds) * 1000),
          url: `https://codeforces.com/contests/${contest.id}`,
          platformLogo: this.platformLogos.codeforces,
        }));
      
      logger.info(`Fetched ${activeContests.length} Codeforces contests`);
      return activeContests;
    } catch (error) {
      logger.error('Error fetching Codeforces contests:', error.message);
      return [];
    }
  }

  // Fetch LeetCode contests
  async fetchLeetcodeContests() {
    try {
      const graphqlQuery = {
        query: `
          query getContestList {
            allContests {
              title
              startTime
              duration
              titleSlug
            }
          }
        `
      };
      
      const response = await axios.post('https://leetcode.com/graphql', graphqlQuery, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
      });
      
      const allContests = response.data.data.allContests;
      const now = Math.floor(Date.now() / 1000);
      
      // Filter only active contests (start time is in the future)
      const activeContests = allContests
        .filter(contest => contest.startTime > now)
        .map(contest => ({
          platform: 'leetcode',
          externalId: `lc_${contest.titleSlug}`,
          name: contest.title,
          startTimeUnix: contest.startTime,
          startTime: new Date(contest.startTime * 1000),
          durationSeconds: contest.duration,
          endTime: new Date((contest.startTime + contest.duration) * 1000),
          url: `https://leetcode.com/contest/${contest.titleSlug}`,
          platformLogo: this.platformLogos.leetcode,
        }));
      
      logger.info(`Fetched ${activeContests.length} LeetCode contests`);
      return activeContests;
    } catch (error) {
      logger.error('Error fetching LeetCode contests:', error.message);
      return [];
    }
  }

  // Fetch CodeChef contests
  async fetchCodechefContests() {
    try {
      const response = await axios.get('https://www.codechef.com/api/list/contests/all', {
        timeout: 10000,
      });
      
      if (!response.data.future_contests) {
        throw new Error('Failed to fetch CodeChef contests');
      }
      
      const activeContests = response.data.future_contests.map(contest => ({
        platform: 'codechef',
        externalId: `cc_${contest.contest_code}`,
        name: contest.contest_name,
        code: contest.contest_code,
        startTimeUnix: Math.floor(new Date(contest.contest_start_date).getTime() / 1000),
        startTime: new Date(contest.contest_start_date),
        endTime: new Date(contest.contest_end_date),
        durationSeconds: this.calculateDuration(contest.contest_start_date, contest.contest_end_date),
        url: `https://www.codechef.com/${contest.contest_code}`,
        platformLogo: this.platformLogos.codechef,
      }));
      
      logger.info(`Fetched ${activeContests.length} CodeChef contests`);
      return activeContests;
    } catch (error) {
      logger.error('Error fetching CodeChef contests:', error.message);
      return [];
    }
  }

  // Fetch AtCoder contests
  async fetchAtCoderContests() {
    try {
      // Using kenkoooo's unofficial API which aggregates AtCoder data
      const response = await axios.get('https://kenkoooo.com/atcoder/resources/contests.json', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      });
      
      const now = Math.floor(Date.now() / 1000);
      
      const activeContests = response.data
        .filter(contest => contest.start_epoch_second > now)
        .map(contest => ({
          platform: 'atcoder',
          externalId: `ac_${contest.id}`,
          name: contest.title,
          startTimeUnix: contest.start_epoch_second,
          startTime: new Date(contest.start_epoch_second * 1000),
          durationSeconds: contest.duration_second,
          endTime: new Date((contest.start_epoch_second + contest.duration_second) * 1000),
          url: `https://atcoder.jp/contests/${contest.id}`,
          platformLogo: this.platformLogos.atcoder,
        }));
      
      logger.info(`Fetched ${activeContests.length} AtCoder contests`);
      return activeContests;
    } catch (error) {
      logger.error('Error fetching AtCoder contests:', error.message);
      return [];
    }
  }

  // Fetch contests from Clist.by (aggregates all platforms)
  async fetchFromClist() {
    try {
      const { username, apiKey } = config.externalAPIs.clist;
      
      if (!username || !apiKey) {
        logger.warn('Clist API credentials not configured, skipping Clist integration');
        return [];
      }

      // Get contests starting from now and for the next 30 days
      const startTime = new Date();
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + 30);

      const response = await axios.get('https://clist.by/api/v4/contest/', {
        params: {
          username,
          api_key: apiKey,
          start__gt: startTime.toISOString(),
          end__lt: endTime.toISOString(),
          // Fetch from all supported platforms (not limiting to specific resources)
          resource__in: 'codeforces.com,leetcode.com,codechef.com,atcoder.jp,hackerrank.com,hackerearth.com',
          order_by: 'start',
          limit: 200, // Increased to get more contests
        },
        timeout: 15000,
      });

      if (!response.data || !response.data.objects) {
        logger.warn('Invalid response from Clist API');
        return [];
      }

      const contests = response.data.objects.map(contest => {
        let platform = 'other';
        const resourceName = (contest.resource?.name || contest.resource || '').toLowerCase();
        
        // Map Clist resource names to our platform enum
        if (resourceName.includes('codeforces')) platform = 'codeforces';
        else if (resourceName.includes('leetcode')) platform = 'leetcode';
        else if (resourceName.includes('codechef')) platform = 'codechef';
        else if (resourceName.includes('atcoder')) platform = 'atcoder';
        else if (resourceName.includes('hackerrank')) platform = 'hackerrank';
        else if (resourceName.includes('hackerearth')) platform = 'hackerearth';

        const startTime = new Date(contest.start);
        const endTime = new Date(contest.end);
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        return {
          platform,
          externalId: `clist_${contest.id}`,
          name: contest.event,
          startTimeUnix: Math.floor(startTime.getTime() / 1000),
          startTime,
          endTime,
          durationSeconds,
          url: contest.href || '',
          platformLogo: this.platformLogos[platform],
        };
      }).filter(c => c.platform !== 'other'); // Only include contests from supported platforms

      logger.info(`Fetched ${contests.length} contests from Clist.by (from ${response.data.objects.length} total)`);
      return contests;
    } catch (error) {
      logger.error('Error fetching from Clist:', error.message);
      return [];
    }
  }

  // Fetch all contests from all platforms
  async fetchContestsFromAPI() {
    try {
      const cacheKey = 'contests:external';
      const cachedData = await cacheGet(cacheKey);

      if (cachedData) {
        logger.info('Returning cached external contests');
        return cachedData;
      }

      logger.info('Fetching contests from all platforms...');
      
      // Try Clist first (aggregated source)
      const clistContests = await this.fetchFromClist();
      
      // If Clist returns contests, use those; otherwise fall back to individual APIs
      let allContests;
      if (clistContests.length > 0) {
        logger.info('Using contests from Clist.by aggregator');
        allContests = clistContests;
      } else {
        logger.info('Falling back to individual platform APIs');
        const [codeforces, leetcode, codechef, atcoder] = await Promise.all([
          this.fetchCodeforcesContests(),
          this.fetchLeetcodeContests(),
          this.fetchCodechefContests(),
          this.fetchAtCoderContests(),
        ]);
        
        allContests = [...codeforces, ...leetcode, ...codechef, ...atcoder];
      }
      
      allContests.sort((a, b) => a.startTimeUnix - b.startTimeUnix);

      // Cache for 30 minutes
      await cacheSet(cacheKey, allContests, config.cache.contestTTL || 1800);

      logger.info(`Fetched total ${allContests.length} contests from all platforms`);
      return allContests;
    } catch (error) {
      logger.error('Error fetching contests from APIs:', error.message);
      return [];
    }
  }

  // Sync contests to database with batch processing
  async syncContests() {
    try {
      const externalContests = await this.fetchContestsFromAPI();

      if (!externalContests || externalContests.length === 0) {
        logger.warn('No contests to sync from external APIs');
        return { synced: 0, total: 0 };
      }

      // Filter out old contests
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const contestsToSync = externalContests.filter(
        contest => new Date(contest.startTime) >= oneDayAgo
      );

      if (contestsToSync.length === 0) {
        logger.info('No new contests to sync (all are too old)');
        return { synced: 0, total: externalContests.length };
      }

      // Deduplicate contests based on URL
      // Prefer platform-specific API data (cf_, lc_, etc.) over Clist data (clist_)
      const urlMap = new Map();
      for (const contest of contestsToSync) {
        const url = contest.url;
        if (!urlMap.has(url)) {
          urlMap.set(url, contest);
        } else {
          const existing = urlMap.get(url);
          // Prefer non-clist sources (they're usually more accurate)
          if (existing.externalId.startsWith('clist_') && !contest.externalId.startsWith('clist_')) {
            urlMap.set(url, contest);
          }
        }
      }
      
      const deduplicatedContests = Array.from(urlMap.values());
      const duplicatesRemoved = contestsToSync.length - deduplicatedContests.length;
      
      if (duplicatesRemoved > 0) {
        logger.info(`Removed ${duplicatesRemoved} duplicate contests based on URL`);
      }

      let syncedCount = 0;
      const BATCH_SIZE = BATCH_SIZES.CONTEST_SYNC;

      // Process contests in batches to avoid memory issues
      for (let i = 0; i < deduplicatedContests.length; i += BATCH_SIZE) {
        const batch = deduplicatedContests.slice(i, i + BATCH_SIZE);
        
        // Process batch with Promise.allSettled to handle individual failures
        const results = await Promise.allSettled(
          batch.map(async (contestData) => {
            const platform = contestData.platform;
            const startTime = contestData.startTime;
            const endTime = contestData.endTime;

            return await prisma.contest.upsert({
              where: {
                externalId_platform: {
                  externalId: contestData.externalId,
                  platform,
                },
              },
              update: {
                name: contestData.name,
                url: contestData.url,
                startTime,
                endTime,
                duration: contestData.durationSeconds,
                status: this.getContestStatus(startTime, endTime),
              },
              create: {
                externalId: contestData.externalId,
                name: contestData.name,
                platform,
                url: contestData.url,
                startTime,
                endTime,
                duration: contestData.durationSeconds,
                platformLogo: contestData.platformLogo,
                status: this.getContestStatus(startTime, endTime),
              },
            });
          })
        );

        // Count successful syncs
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            syncedCount++;
          } else {
            logger.error(`Error syncing contest in batch ${i}-${i+BATCH_SIZE}: ${batch[index].name}`, result.reason);
          }
        });

        logger.debug(`Processed batch ${i / BATCH_SIZE + 1}: ${results.filter(r => r.status === 'fulfilled').length}/${batch.length} successful`);
      }

      logger.info(`Synced ${syncedCount} out of ${deduplicatedContests.length} contests (${duplicatesRemoved} duplicates removed, total fetched: ${externalContests.length})`);

      // Clear cache
      await cacheSet('contests:synced', Date.now(), 3600);

      return { synced: syncedCount, total: externalContests.length, processed: contestsToSync.length };
    } catch (error) {
      logger.error('Error syncing contests:', error);
      throw error;
    }
  }

  // Helper: Enrich contests with reminder status for a user
  async enrichContestsWithReminderStatus(contests, userId) {
    if (!userId || !contests || contests.length === 0) {
      // No user or no contests - mark all as not set
      return contests.map(contest => ({ ...contest, isSet: false }));
    }

    try {
      // Get all contest IDs
      const contestIds = contests.map(c => c.id);

      // Fetch all reminders for this user and these contests in one query
      const reminders = await prisma.reminder.findMany({
        where: {
          userId,
          contestId: { in: contestIds },
          isActive: true,
        },
        select: {
          contestId: true,
        },
      });

      // Create a Set for O(1) lookup
      const reminderSet = new Set(reminders.map(r => r.contestId));

      // Enrich contests with isSet flag
      return contests.map(contest => ({
        ...contest,
        isSet: reminderSet.has(contest.id),
      }));
    } catch (error) {
      logger.error('Error enriching contests with reminder status:', error);
      // On error, return contests with isSet: false
      return contests.map(contest => ({ ...contest, isSet: false }));
    }
  }

  // Get all contests with filters
  async getContests(filters = {}) {
    const { platform, status, page = 1, limit = 20, startDate, endDate, userId, usePreferences = false } = filters;

    const cacheKey = `contests:list:${JSON.stringify(filters)}`;
    const cachedData = await cacheGet(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const where = { isActive: true };

    // Filter by user's preferred platforms if requested
    if (usePreferences && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferredPlatforms: true },
      });

      if (user && user.preferredPlatforms && Array.isArray(user.preferredPlatforms) && user.preferredPlatforms.length > 0) {
        where.platform = { in: user.preferredPlatforms };
      }
    } else if (platform) {
      // Otherwise use platform filter if provided
      where.platform = platform;
    }

    if (status) {
      where.status = status;
    } else {
      // Default: only show upcoming and ongoing contests
      where.status = { in: ['upcoming', 'ongoing'] };
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.startTime = { gte: new Date(startDate) };
    }

    const skip = (page - 1) * limit;

    const [contests, count] = await Promise.all([
      prisma.contest.findMany({
        where,
        orderBy: { startTime: 'asc' },
        take: parseInt(limit),
        skip,
      }),
      prisma.contest.count({ where }),
    ]);

    // Enrich contests with reminder status
    const enrichedContests = await this.enrichContestsWithReminderStatus(contests, userId);

    const result = {
      contests: enrichedContests,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    };

    // Cache for 10 minutes
    await cacheSet(cacheKey, result, 600);

    return result;
  }

  // Get contest by ID
  async getContestById(contestId, userId = null) {
    const cacheKey = `contest:${contestId}:${userId || 'public'}`;
    const cachedData = await cacheGet(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    let contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      throw new NotFoundError('Contest not found');
    }

    // Update status if needed
    const currentStatus = this.getContestStatus(contest.startTime, contest.endTime);
    if (contest.status !== currentStatus) {
      contest = await prisma.contest.update({
        where: { id: contestId },
        data: { status: currentStatus },
      });
    }

    // Enrich with reminder status
    const [enrichedContest] = await this.enrichContestsWithReminderStatus([contest], userId);

    await cacheSet(cacheKey, enrichedContest, 600);

    return enrichedContest;
  }

  // Get upcoming contests (next 7 days)
  async getUpcomingContests(limit = 10, userId = null) {
    const cacheKey = `contests:upcoming:${limit}:${userId || 'public'}`;
    const cachedData = await cacheGet(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const contests = await prisma.contest.findMany({
      where: {
        status: 'upcoming',
        startTime: {
          gte: now,
          lte: sevenDaysLater,
        },
        isActive: true,
      },
      orderBy: { startTime: 'asc' },
      take: parseInt(limit),
    });

    // Enrich with reminder status
    const enrichedContests = await this.enrichContestsWithReminderStatus(contests, userId);

    await cacheSet(cacheKey, enrichedContests, 300);

    return enrichedContests;
  }

  // Get contests by platform
  async getContestsByPlatform(platform, limit = 20, userId = null) {
    const cacheKey = `contests:platform:${platform}:${limit}:${userId || 'public'}`;
    const cachedData = await cacheGet(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const contests = await prisma.contest.findMany({
      where: {
        platform,
        status: { in: ['upcoming', 'ongoing'] },
        isActive: true,
      },
      orderBy: { startTime: 'asc' },
      take: parseInt(limit),
    });

    // Enrich with reminder status
    const enrichedContests = await this.enrichContestsWithReminderStatus(contests, userId);

    await cacheSet(cacheKey, enrichedContests, 600);

    return enrichedContests;
  }

  // Helper: Determine contest status
  getContestStatus(startTime, endTime) {
    const now = new Date();

    if (now < new Date(startTime)) {
      return 'upcoming';
    } else if (now >= new Date(startTime) && now <= new Date(endTime)) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  }

  // Update contest statuses (run periodically)
  async updateContestStatuses() {
    try {
      const contests = await prisma.contest.findMany({
        where: {
          status: { in: ['upcoming', 'ongoing'] },
        },
      });

      let updatedCount = 0;

      for (const contest of contests) {
        const newStatus = this.getContestStatus(contest.startTime, contest.endTime);

        if (contest.status !== newStatus) {
          await prisma.contest.update({
            where: { id: contest.id },
            data: { status: newStatus },
          });
          updatedCount++;
        }
      }

      logger.info(`Updated status for ${updatedCount} contests`);
      return updatedCount;
    } catch (error) {
      logger.error('Error updating contest statuses:', error);
      throw error;
    }
  }
}

module.exports = new ContestService();
