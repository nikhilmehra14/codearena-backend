const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { UnauthorizedError } = require('../utils/errorHandler');
const { asyncHandler } = require('../utils/errorHandler');
const config = require('../config/config');
const { USER_SELECT_FIELDS } = require('../constants/database');
const ERROR_MESSAGES = require('../constants/errors');
const { cacheGet, cacheSet } = require('../config/redis');
const logger = require('../utils/logger');

// Generate Access Token
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expire,
  });
};

// Generate Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
  });
};

// Verify Access Token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

// Verify Refresh Token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

// Helper function to blacklist a token
const blacklistToken = async (token) => {
  try {
    // Decode token to get expiration time
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      logger.warn('Cannot blacklist token: invalid or missing expiration');
      return;
    }

    // Calculate TTL (time until token expires)
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    // Only blacklist if token hasn't expired yet
    if (ttl > 0) {
      const blacklistKey = `blacklist:${token}`;
      await cacheSet(blacklistKey, 'revoked', ttl);
      logger.debug(`Token blacklisted with TTL: ${ttl}s`);
    }
  } catch (error) {
    logger.error('Error blacklisting token:', error);  }
};

// Helper function to check if token is blacklisted
const isTokenBlacklisted = async (token) => {
  try {
    const blacklistKey = `blacklist:${token}`;
    const result = await cacheGet(blacklistKey);
    return result !== null;
  } catch (error) {
    logger.error('Error checking token blacklist:', error);    return false;
  }
};

// Protect middleware - Verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }  if (!token) {
    throw new UnauthorizedError(ERROR_MESSAGES.AUTH.NO_TOKEN);
  }

  try {
    // Check if token is blacklisted (logged out)
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }    const decoded = verifyAccessToken(token);    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: USER_SELECT_FIELDS,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError(ERROR_MESSAGES.AUTH.USER_NOT_FOUND);
    }

    req.user = user;
    next();
  } catch (error) {
    throw new UnauthorizedError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  }
});

// Optional auth middleware - Doesn't fail if no token
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      // Check if token is blacklisted (logged out)
      const isBlacklisted = await isTokenBlacklisted(token);
      if (!isBlacklisted) {
        // Only set user if token is not blacklisted
        const decoded = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: USER_SELECT_FIELDS,
        });

        if (user && user.isActive) {
          req.user = user;
        }
      }
    } catch (error) {    }
  }

  next();
});

// Admin middleware - Requires admin role (placeholder for future implementation)
const requireAdmin = asyncHandler(async (req, res, next) => {
  // TODO: Implement role-based access control
  // For now, just check if user is authenticated
  if (!req.user) {
    throw new UnauthorizedError(ERROR_MESSAGES.AUTH.ADMIN_REQUIRED);
  }
  next();
});

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  protect,
  optionalAuth,
  requireAdmin,
  blacklistToken,
  isTokenBlacklisted,
};
