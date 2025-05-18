const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const supabase = require('../config/supabase');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Middleware to protect routes - requires authentication
 */
const protect = async (req, res, next) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return next(new ApiError(401, 'Not authorized, no token'));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.supabase.jwtSecret);
      
      // Get user from Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.sub)
        .single();
      
      if (error || !user) {
        return next(new ApiError(401, 'Not authorized, invalid token'));
      }
      
      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      logger.error('JWT verification error:', error);
      return next(new ApiError(401, 'Not authorized, invalid token'));
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return next(new ApiError(500, 'Authentication error'));
  }
};

/**
 * Optional authentication middleware - doesn't require authentication
 * but will add user to request if token is valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, continue without user
    if (!token) {
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.supabase.jwtSecret);
      
      // Get user from Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.sub)
        .single();
      
      if (!error && user) {
        // Add user to request
        req.user = user;
      }
      
      next();
    } catch (error) {
      // Continue without user if token is invalid
      logger.warn('Invalid token in optionalAuth:', error.message);
      next();
    }
  } catch (error) {
    logger.error('OptionalAuth middleware error:', error);
    next();
  }
};

module.exports = {
  protect,
  optionalAuth,
};
