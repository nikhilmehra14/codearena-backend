const crypto = require('crypto');

/**
 * Request ID middleware
 * Adds a unique ID to each request for tracing and debugging
 */
const requestId = (req, res, next) => {
  // Generate a unique request ID
  req.id = crypto.randomUUID();
  
  // Add to response headers for client tracking
  res.setHeader('X-Request-Id', req.id);
  
  next();
};

module.exports = { requestId };


