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
    fullName: Joi.string().min(2).required(),
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
  // Validate request data
  const { email, password, fullName } = validateRegisterData(req.body);

  // Register user
  const result = await supabaseService.registerUser(email, password, fullName);

  // Return response
  res.status(201).json({
    success: true,
    data: {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.full_name,
        createdAt: result.user.created_at,
      },
      token: result.token,
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  try {
    // Check if the request is from the token endpoint (multipart/form-data)
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Extract credentials from form data
      const email = req.body.username;
      const password = req.body.password;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      // Login user
      const result = await supabaseService.loginUser(email, password);

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
    } else {
      // Regular JSON request
      // Validate request data
      const { email, password } = validateLoginData(req.body);

      // Login user
      const result = await supabaseService.loginUser(email, password);

      // Return response
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.full_name,
            createdAt: result.user.created_at,
            lastSignIn: result.user.last_sign_in,
          },
          token: result.token,
        },
      });
    }
  } catch (error) {
    logger.error('Login error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'An error occurred during login',
    });
  }
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  // User is already attached to request by auth middleware
  const user = req.user;

  // Return response
  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in,
    },
  });
});

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};
