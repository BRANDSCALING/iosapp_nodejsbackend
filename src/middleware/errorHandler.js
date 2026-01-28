/**
 * Global Error Handler Middleware
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Database errors
  if (err.code === '23505') {
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (err.code === '23503') {
    statusCode = 400;
    message = 'Foreign key constraint violation';
  } else if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid input syntax';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
