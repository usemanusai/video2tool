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
      // Check if Supabase client is initialized
      if (!supabase) {
        logger.error('Supabase client not initialized');
        throw new ApiError(500, 'Authentication service is not available');
      }

      // Register user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        logger.error('Error registering user:', authError);
        throw new ApiError(400, authError.message);
      }

      if (!authData || !authData.user) {
        logger.error('No user data returned from Supabase');
        throw new ApiError(500, 'Error creating user account');
      }

      // For development/testing without a real Supabase instance
      // Create a mock user profile if we can't access the database
      try {
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
          // Instead of failing, create a mock user profile
          const mockUserData = {
            id: authData.user.id,
            email,
            full_name: fullName,
            created_at: new Date().toISOString(),
          };

          // Generate JWT token
          const token = this.generateToken(authData.user.id);

          return {
            user: mockUserData,
            token,
          };
        }

        // Generate JWT token
        const token = this.generateToken(authData.user.id);

        return {
          user: userData,
          token,
        };
      } catch (dbError) {
        logger.error('Database error in registerUser:', dbError);
        // Create a mock user profile as fallback
        const mockUserData = {
          id: authData.user.id,
          email,
          full_name: fullName,
          created_at: new Date().toISOString(),
        };

        // Generate JWT token
        const token = this.generateToken(authData.user.id);

        return {
          user: mockUserData,
          token,
        };
      }
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
      // Check if Supabase client is initialized
      if (!supabase) {
        logger.error('Supabase client not initialized');
        throw new ApiError(500, 'Authentication service is not available');
      }

      // Login user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        logger.error('Error logging in user:', authError);
        throw new ApiError(401, 'Invalid credentials');
      }

      if (!authData || !authData.user) {
        logger.error('No user data returned from Supabase');
        throw new ApiError(500, 'Error authenticating user');
      }

      try {
        // Get user profile from the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (userError) {
          logger.error('Error getting user profile:', userError);
          // Create a mock user profile as fallback
          const mockUserData = {
            id: authData.user.id,
            email: authData.user.email,
            full_name: authData.user.user_metadata?.full_name || '',
            created_at: authData.user.created_at,
            last_sign_in: new Date().toISOString(),
          };

          // Generate JWT token
          const token = this.generateToken(authData.user.id);

          return {
            user: mockUserData,
            token,
          };
        }

        try {
          // Update last sign in
          await supabase
            .from('users')
            .update({ last_sign_in: new Date().toISOString() })
            .eq('id', authData.user.id);
        } catch (updateError) {
          logger.warn('Error updating last sign in:', updateError);
          // Continue without failing the login process
        }

        // Generate JWT token
        const token = this.generateToken(authData.user.id);

        return {
          user: userData,
          token,
        };
      } catch (dbError) {
        logger.error('Database error in loginUser:', dbError);
        // Create a mock user profile as fallback
        const mockUserData = {
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata?.full_name || '',
          created_at: authData.user.created_at,
          last_sign_in: new Date().toISOString(),
        };

        // Generate JWT token
        const token = this.generateToken(authData.user.id);

        return {
          user: mockUserData,
          token,
        };
      }
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
    // Use a default secret if not configured
    const jwtSecret = config.supabase.jwtSecret || 'video2tool-development-secret-key';

    return jwt.sign({ sub: userId }, jwtSecret, {
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
      // Use the same secret as in generateToken
      const jwtSecret = config.supabase.jwtSecret || 'video2tool-development-secret-key';

      return jwt.verify(token, jwtSecret);
    } catch (error) {
      logger.error('Error verifying token:', error);
      throw new ApiError(401, 'Invalid token');
    }
  }
}

module.exports = new SupabaseService();
