const config = require('../config');

function notFound(_req, _res, next) {
  const error = new Error('Route not found');
  error.statusCode = 404;
  next(error);
}

function errorHandler(err, _req, res, _next) {
  const statusCode = err.status || err.statusCode || 500;

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate resource',
      fields: Object.keys(err.keyPattern || {})
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(config.nodeEnv !== 'production' ? { stack: err.stack } : {})
  });
}

module.exports = { notFound, errorHandler };
