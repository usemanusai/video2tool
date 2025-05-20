const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const supabaseService = require('../services/supabaseService');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Validate registration data
 * @param {object} data - Registration data
 * @returns {object} - Validated data
 */
const validateRegisterData = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().min(2).optional(),
    fullName: Joi.string().min(2).optional(), // For backward compatibility
  });

  const { error, value } = schema.validate(data);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  return value;
};

/**
 * Validate login data
 * @param {object} data - Login data
 * @returns {object} - Validated data
 */
const validateLoginData = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  return value;
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  try {
    // Validate request data
    const validatedData = validateRegisterData(req.body);
    const { email, password } = validatedData;

    // Get the full_name from either full_name or fullName property
    const fullName = validatedData.full_name || validatedData.fullName || '';

    logger.info(`Attempting to register user: ${email}`);

    // Register user
    const result = await supabaseService.registerUser(email, password, fullName);

    if (!result || !result.user) {
      logger.error('Registration failed: No user data returned');
      return res.status(500).json({
        detail: 'Registration failed due to an internal error',
      });
    }

    logger.info(`User registered successfully: ${email} (${result.user.id})`);

    // Return response in the format expected by the frontend
    res.status(201).json({
      id: result.user.id,
      email: result.user.email,
      full_name: result.user.full_name,
      created_at: result.user.created_at,
    });
  } catch (error) {
    logger.error('Registration error:', error);

    // Determine the appropriate status code and error message
    let statusCode = error.statusCode || 400;
    let errorMessage = error.message || 'An error occurred during registration';

    // Handle specific error cases
    if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
      statusCode = 409; // Conflict
      errorMessage = 'A user with this email already exists';
    } else if (errorMessage.includes('invalid email')) {
      statusCode = 400;
      errorMessage = 'Please provide a valid email address';
    } else if (errorMessage.includes('password')) {
      statusCode = 400;
      errorMessage = 'Password must be at least 6 characters long';
    }

    res.status(statusCode).json({
      detail: errorMessage,
    });
  }
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  try {
    let email, password;

    // Log the request for debugging
    logger.info('Login request received:', {
      contentType: req.headers['content-type'],
      body: req.body
    });

    // Check if the request is from the token endpoint (multipart/form-data)
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Extract credentials from form data
      email = req.body.username;
      password = req.body.password;
      logger.info('Extracted credentials from form data');
    } else {
      // Regular JSON request
      try {
        const validatedData = validateLoginData(req.body);
        email = validatedData.email;
        password = validatedData.password;
        logger.info('Extracted credentials from JSON data');
      } catch (validationError) {
        logger.error('Validation error:', validationError);
        return res.status(400).json({
          detail: validationError.message || 'Invalid request format'
        });
      }
    }

    if (!email || !password) {
      logger.warn('Login attempt with missing credentials');
      return res.status(400).json({
        detail: 'Email and password are required',
      });
    }

    logger.info(`Login attempt for user: ${email}`);

    // Special case for test user in development
    if (process.env.NODE_ENV === 'development' && email === 'test@example.com' && password === 'password123') {
      logger.info('Using hardcoded test user credentials');

      const testUser = {
        id: 'user_test123',
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString(),
      };

      const token = supabaseService.generateToken(testUser.id);

      return res.status(200).json({
        user: testUser,
        access_token: token,
        token_type: 'bearer',
      });
    }

    // Login user through Supabase
    const result = await supabaseService.loginUser(email, password);

    if (!result || !result.user || !result.token) {
      logger.error('Login failed: Invalid response from authentication service');
      return res.status(500).json({
        detail: 'Authentication failed due to an internal error',
      });
    }

    logger.info(`User logged in successfully: ${email} (${result.user.id})`);

    // Return response in the format expected by the frontend
    return res.status(200).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        full_name: result.user.full_name,
        created_at: result.user.created_at,
        last_sign_in: result.user.last_sign_in,
      },
      access_token: result.token,
      token_type: 'bearer',
    });
  } catch (error) {
    logger.error('Login error:', error);

    // Determine the appropriate status code and error message
    let statusCode = error.statusCode || 401;
    let errorMessage = error.message || 'An error occurred during login';

    // Handle specific error cases
    if (errorMessage.includes('Invalid credentials') ||
        errorMessage.includes('invalid login') ||
        errorMessage.includes('Invalid email or password')) {
      statusCode = 401;
      errorMessage = 'Invalid email or password';
    } else if (errorMessage.includes('not found')) {
      statusCode = 401;
      errorMessage = 'Account not found';
    } else if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Too many login attempts. Please try again later.';
    }

    res.status(statusCode).json({
      detail: errorMessage,
    });
  }
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    // User is already attached to request by auth middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        detail: 'User not authenticated',
      });
    }

    // Return response in the format expected by the frontend
    res.status(200).json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      created_at: user.created_at,
      last_sign_in: user.last_sign_in,
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(error.statusCode || 500).json({
      detail: error.message || 'An error occurred while fetching user data',
    });
  }
});

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};
