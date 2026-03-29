const AppError = require('../utils/AppError');
const { authMiddleware } = require('./authMiddleware');
const User = require('../models/User');

function auth(requiredRole = null) {
  return (req, res, next) => {
    authMiddleware(req, res, async (error) => {
      try {
        if (error) return next(error);
        if (requiredRole && req.user?.role !== 'admin' && req.user?.role !== requiredRole) {
          return next(new AppError('Forbidden', 403));
        }
        if (requiredRole === 'author' && req.user?.role === 'author') {
          const authorUser = await User.findById(req.user.id).select('authorTermsAcceptance').lean();
          if (!authorUser?.authorTermsAcceptance?.acceptedTerms) {
            return next(new AppError('You must accept Terms & Conditions to become an author', 403));
          }
        }
        return next();
      } catch (lookupError) {
        return next(lookupError);
      }
    });
  };
}

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return next();
  }

  return authMiddleware(req, _res, (error) => {
    if (error) {
      req.user = null;
    }
    return next();
  });
}

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
