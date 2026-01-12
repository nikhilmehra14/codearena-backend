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
        // Zod errors can have either 'errors' or 'issues' property depending on version
        const issues = error.issues || error.errors;
        
        if (!issues || !Array.isArray(issues)) {
          console.error('ZodError without issues/errors array:', error);
          // Try to get error message from the error object itself
          const message = error.message || 'Validation failed';
          return next(new ValidationError(message));
        }
        
        // Format Zod errors into structured format
        const validationErrors = issues.map((err) => {
          let path = err.path ? err.path.join('.') : 'unknown';
          
          // Remove 'body.', 'query.', or 'params.' prefix for cleaner error messages
          path = path.replace(/^(body|query|params)\./, '');
          
          return {
            field: path,
            message: err.message
          };
        });
        
        // Create a summary message
        const summary = validationErrors.length === 1 
          ? validationErrors[0].message 
          : `${validationErrors.length} validation errors occurred`;
        
        // Pass validation error to error handler with structured errors
        return next(new ValidationError(summary, validationErrors));
      }
      
      // Pass other errors to error handler
      next(error);
    }
  };
};

module.exports = { validateRequest };


