const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Supabase service for authentication and database operations
 */
class SupabaseService {
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} fullName - User's full name
   * @returns {Promise<object>} - User data and token
   */
  async registerUser(email, password, fullName) {
    try {
      // Register user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        logger.error('Error registering user:', authError);
        throw new ApiError(400, authError.message);
      }

      // Create user profile in the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            full_name: fullName,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (userError) {
        logger.error('Error creating user profile:', userError);
        throw new ApiError(500, 'Error creating user profile');
      }

      // Generate JWT token
      const token = this.generateToken(authData.user.id);

      return {
        user: userData,
        token,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error in registerUser:', error);
      throw new ApiError(500, 'Error registering user');
    }
  }

  /**
   * Login a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} - User data and token
   */
  async loginUser(email, password) {
    try {
      // Login user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        logger.error('Error logging in user:', authError);
        throw new ApiError(401, 'Invalid credentials');
      }

      // Get user profile from the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        logger.error('Error getting user profile:', userError);
        throw new ApiError(500, 'Error getting user profile');
      }

      // Update last sign in
      await supabase
        .from('users')
        .update({ last_sign_in: new Date().toISOString() })
        .eq('id', authData.user.id);

      // Generate JWT token
      const token = this.generateToken(authData.user.id);

      return {
        user: userData,
        token,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error in loginUser:', error);
      throw new ApiError(500, 'Error logging in user');
    }
  }

  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @returns {string} - JWT token
   */
  generateToken(userId) {
    return jwt.sign({ sub: userId }, config.supabase.jwtSecret, {
      expiresIn: '24h',
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {object} - Decoded token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.supabase.jwtSecret);
    } catch (error) {
      logger.error('Error verifying token:', error);
      throw new ApiError(401, 'Invalid token');
    }
  }
}

module.exports = new SupabaseService();
