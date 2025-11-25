const redis = require('redis');
const config = require('./config');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✓ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('✓ Redis is ready to use');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });

    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    logger.error('✗ Redis connection failed:', error);
    logger.warn('Application will continue without caching');
    // Don't throw - allow app to continue without Redis
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient || !redisClient.isOpen) {
    logger.warn('Redis client is not connected - caching disabled');
    return null;
  }
  return redisClient;
};

const closeRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

// Cache helper functions
const cacheGet = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return null; // Redis not available
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null; // Return null on error, don't break the app
  }
};

const cacheSet = async (key, value, ttl = config.cache.ttl) => {
  try {
    const client = getRedisClient();
    if (!client) return false; // Redis not available
    await client.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
    return false; // Return false on error, don't break the app
  }
};

const cacheDel = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return false; // Redis not available
    await client.del(key);
    return true;
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
};

const cacheDelPattern = async (pattern) => {
  try {
    const client = getRedisClient();
    if (!client) return false; // Redis not available
    
    // Use SCAN instead of KEYS for better performance
    let cursor = '0';
    let deletedCount = 0;
    
    do {
      const reply = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      
      cursor = reply.cursor;
      
      if (reply.keys && reply.keys.length > 0) {
        await client.del(reply.keys);
        deletedCount += reply.keys.length;
      }
    } while (cursor !== '0');
    
    if (deletedCount > 0) {
      logger.debug(`Deleted ${deletedCount} keys matching pattern: ${pattern}`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Cache delete pattern error for ${pattern}:`, error);
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
};
