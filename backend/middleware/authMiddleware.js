const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const User = require('../models/User');

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError('Unauthorized: token missing', 401));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.id, _id: payload.id, role: payload.role, name: payload.name };
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

function requireRole(...roles) {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Unauthorized', 401));
      }

      if (req.user.role === 'admin') {
        return next();
      }

      if (!roles.includes(req.user.role)) {
        return next(new AppError('Forbidden', 403));
      }

      if (roles.includes('author') && req.user.role === 'author') {
        const authorUser = await User.findById(req.user.id).select('authorTermsAcceptance').lean();
        if (!authorUser?.authorTermsAcceptance?.acceptedTerms) {
          return next(new AppError('You must accept Terms & Conditions to become an author', 403));
        }
      }

      return next();
    } catch (lookupError) {
      return next(lookupError);
    }
  };
}

function requireRoles(roles = []) {
  return requireRole(...roles);
}

module.exports = { authMiddleware, requireAdmin, requireRole, requireRoles };
