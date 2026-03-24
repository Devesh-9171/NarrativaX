const config = require('../config');

function notFound(_req, _res, next) {
  const error = new Error('Route not found');
  error.statusCode = 404;
  next(error);
}

function errorHandler(err, _req, res, _next) {
  const statusCode = err.status || err.statusCode || 500;


  if (err.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image size must be 5MB or smaller'
      : err.message;

    return res.status(status).json({
      success: false,
      message
    });
  }

  if (typeof err.message === 'string' && err.message.includes('Only JPG, PNG, and WEBP image files are allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

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
