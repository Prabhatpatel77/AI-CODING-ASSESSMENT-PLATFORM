/**
 * Centralized Error Handling Middleware
 */

export function notFoundHandler(req, res, next) {
  const error = new Error(`Resource not found: ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: error.message,
    timestamp: new Date().toISOString(),
  });
}

export function globalErrorHandler(err, req, res, next) {
  console.error('[ServerError]', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
}
