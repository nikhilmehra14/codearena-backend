const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config/config');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.filePath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Redact sensitive information
const redactSensitiveData = winston.format((info) => {
  if (info.message && typeof info.message === 'string') {
    // Redact passwords, tokens, API keys, secrets
    info.message = info.message
      .replace(/(password|passwd|pwd)[\s:="']+[\w\-@#$%^&*!]+/gi, '$1=***REDACTED***')
      .replace(/(token|apikey|api_key|secret|auth)[\s:="']+[\w\-_.]+/gi, '$1=***REDACTED***')
      .replace(/Bearer[\s]+[\w\-_.]+/gi, 'Bearer ***REDACTED***')
      .replace(/Basic[\s]+[A-Za-z0-9+/=]+/gi, 'Basic ***REDACTED***')
      .replace(/(\d{4}[\s\-]?){3}\d{4}/g, '****-****-****-****'); // Credit cards
  }
  
  // Remove sensitive fields from metadata
  const sensitiveFields = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization', 'cookie', 'passwd', 'pwd'];
  sensitiveFields.forEach(field => {
    if (info[field]) info[field] = '***REDACTED***';
  });
  
  // Better error serialization (prevent character-by-character objects)
  if (info.level === 'error' && info.message && typeof info.message === 'object') {
    info.message = JSON.stringify(info.message);
  }
  
  return info;
})();

// Define log format
const logFormat = winston.format.combine(
  redactSensitiveData,
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'codearena-backend' },
  transports: [
    // Write all logs with daily rotation (7 days retention)
    new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '5m',
      maxFiles: '7d', // Keep logs for 7 days
      zippedArchive: true, // Compress old logs
      format: logFormat,
    }),
    // Write errors to separate file (14 days retention)
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '5m',
      maxFiles: '14d', // Keep error logs for 14 days
      zippedArchive: true,
      format: logFormat,
    }),
  ],
});

// Add console transport in development
if (config.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

module.exports = logger;
