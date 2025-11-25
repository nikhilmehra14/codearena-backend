const logger = require('./logger');
const { HttpStatus } = require('../constants/httpStatus');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, HttpStatus.BAD_REQUEST.code);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, HttpStatus.UNAUTHORIZED.code);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, HttpStatus.FORBIDDEN.code);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND.code);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, HttpStatus.CONFLICT.code);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR.code);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, HttpStatus.BAD_REQUEST.code);
  }
}

class ServiceError extends AppError {
  constructor(message = 'Service unavailable') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE.code);
  }
}

const handleError = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = new ValidationError('Invalid resource ID');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error = new ConflictError('Duplicate field value entered');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = new ValidationError(messages.join(', '));
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message);
    error = new ValidationError(messages.join(', '));
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    error = new ConflictError('Resource already exists');
  }

  // Prisma errors
  if (err.code === 'P2002') {
    // Unique constraint violation
    const field = err.meta?.target?.[0] || 'field';
    error = new ConflictError(`${field} already exists`);
  }

  if (err.code === 'P2025') {
    // Record not found
    error = new NotFoundError('Record not found');
  }

  if (err.code === 'P2003') {
    // Foreign key constraint failed
    error = new ValidationError('Invalid reference to related record');
  }

  if (err.code === 'P2014') {
    // Required relation violation
    error = new ValidationError('Invalid relation');
  }

  // Prisma client initialization error
  if (err.code === 'P1001') {
    error = new InternalServerError('Cannot reach database server');
  }

  // Prisma client validation error
  if (err.code === 'P2000') {
    error = new ValidationError('Value too long for field');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  }

  res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR.code).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BadRequestError,
  ServiceError,
  handleError,
  asyncHandler,
};
