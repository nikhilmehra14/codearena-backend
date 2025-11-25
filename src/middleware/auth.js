const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { UnauthorizedError } = require('../utils/errorHandler');
const { asyncHandler } = require('../utils/errorHandler');
const config = require('../config/config');
const { USER_SELECT_FIELDS } = require('../constants/database');
const ERROR_MESSAGES = require('../constants/errors');

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

// Protect middleware - Verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    throw new UnauthorizedError(ERROR_MESSAGES.AUTH.NO_TOKEN);
  }

  try {
    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from token using centralized select fields
    const user = await prisma.user.findUnique({
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
      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: USER_SELECT_FIELDS,
      });

      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silent fail for optional auth
    }
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
};
