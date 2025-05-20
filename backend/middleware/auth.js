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
      return res.status(401).json({ detail: 'Not authorized, no token' });
    }

    try {
      // Use a default secret if not configured
      const jwtSecret = config.supabase.jwtSecret || 'video2tool-development-secret-key';

      // Verify token
      const decoded = jwt.verify(token, jwtSecret);

      try {
        // Get user from Supabase
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', decoded.sub)
          .single();

        if (error || !user) {
          // For development, create a mock user if database access fails
          if (process.env.NODE_ENV === 'development') {
            logger.warn('Using mock user in development mode');
            req.user = {
              id: decoded.sub,
              email: 'user@example.com',
              full_name: 'Test User',
              created_at: new Date().toISOString(),
              last_sign_in: new Date().toISOString(),
            };
            return next();
          }

          return res.status(401).json({ detail: 'Not authorized, user not found' });
        }

        // Add user to request
        req.user = user;
        next();
      } catch (dbError) {
        logger.error('Database error in auth middleware:', dbError);

        // For development, create a mock user if database access fails
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Using mock user in development mode');
          req.user = {
            id: decoded.sub,
            email: 'user@example.com',
            full_name: 'Test User',
            created_at: new Date().toISOString(),
            last_sign_in: new Date().toISOString(),
          };
          return next();
        }

        return res.status(500).json({ detail: 'Error accessing user data' });
      }
    } catch (jwtError) {
      logger.error('JWT verification error:', jwtError);
      return res.status(401).json({ detail: 'Not authorized, invalid token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ detail: 'Authentication error' });
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
      // Use a default secret if not configured
      const jwtSecret = config.supabase.jwtSecret || 'video2tool-development-secret-key';

      // Verify token
      const decoded = jwt.verify(token, jwtSecret);

      try {
        // Get user from Supabase
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', decoded.sub)
          .single();

        if (!error && user) {
          // Add user to request
          req.user = user;
        } else if (process.env.NODE_ENV === 'development') {
          // For development, create a mock user if database access fails
          logger.warn('Using mock user in development mode (optionalAuth)');
          req.user = {
            id: decoded.sub,
            email: 'user@example.com',
            full_name: 'Test User',
            created_at: new Date().toISOString(),
            last_sign_in: new Date().toISOString(),
          };
        }
      } catch (dbError) {
        logger.warn('Database error in optionalAuth:', dbError.message);

        if (process.env.NODE_ENV === 'development') {
          // For development, create a mock user if database access fails
          logger.warn('Using mock user in development mode (optionalAuth)');
          req.user = {
            id: decoded.sub,
            email: 'user@example.com',
            full_name: 'Test User',
            created_at: new Date().toISOString(),
            last_sign_in: new Date().toISOString(),
          };
        }
      }

      next();
    } catch (jwtError) {
      // Continue without user if token is invalid
      logger.warn('Invalid token in optionalAuth:', jwtError.message);
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
