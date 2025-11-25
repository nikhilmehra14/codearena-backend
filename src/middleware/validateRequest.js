const { ZodError } = require('zod');
const { ValidationError } = require('../utils/errorHandler');

/**
 * Zod validation middleware
 * Validates request data (body, query, params) against a Zod schema
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate the entire request (body, query, params)
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request data with validated (and sanitized) data
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a readable format
        const errorMessages = error.errors.map((err) => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });
        
        throw new ValidationError(errorMessages.join('; '));
      }
      
      // Pass other errors to error handler
      next(error);
    }
  };
};

module.exports = { validateRequest };

