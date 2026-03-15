const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError('Unauthorized: token missing', 401));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (_error) {
    return next(new AppError('Unauthorized: invalid token', 401));
  }
}

function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(new AppError('Forbidden: admin access required', 403));
  }

  return next();
}

module.exports = { authMiddleware, requireAdmin };
