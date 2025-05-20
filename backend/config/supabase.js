const { createClient } = require('@supabase/supabase-js');
const config = require('./index');
const logger = require('../utils/logger');

// Create Supabase client
let supabase = null;

// In-memory storage for mock users (for development only)
const mockUsers = new Map();
const mockProfiles = new Map();

try {
  if (config.supabase.url && config.supabase.key) {
    supabase = createClient(config.supabase.url, config.supabase.key);
    logger.info('Supabase client initialized with real credentials');
  } else {
    // For development/testing, create a mock Supabase client
    logger.warn('Supabase URL or key not set. Using mock Supabase client for development.');

    // Create a minimal mock client for development
    supabase = {
      auth: {
        signUp: async ({ email, password }) => {
          // Check if user already exists
          const existingUser = Array.from(mockUsers.values()).find(user => user.email === email);
          if (existingUser) {
            return {
              data: null,
              error: {
                message: 'User already exists with this email',
                status: 400
              }
            };
          }

          // Generate a stable UUID for the user based on email
          const userId = 'user_' + Buffer.from(email).toString('hex').substring(0, 10);

          // Store user in mock database
          const newUser = {
            id: userId,
            email,
            password, // In a real system, this would be hashed
            created_at: new Date().toISOString(),
            user_metadata: {}
          };

          mockUsers.set(userId, newUser);
          logger.info(`Mock user created: ${email} (${userId})`);

          return {
            data: {
              user: {
                id: userId,
                email,
                created_at: newUser.created_at,
                user_metadata: {}
              }
            },
            error: null
          };
        },
        signInWithPassword: async ({ email, password }) => {
          logger.info(`Attempting to sign in user: ${email}`);

          // Special case for test user
          if (email === 'test@example.com' && password === 'password123') {
            logger.info(`Test user logged in: ${email}`);
            return {
              data: {
                user: {
                  id: 'user_test123',
                  email: 'test@example.com',
                  created_at: new Date().toISOString(),
                  user_metadata: { full_name: 'Test User' }
                }
              },
              error: null
            };
          }

          // Find user by email
          const user = Array.from(mockUsers.values()).find(user => {
            logger.debug(`Comparing: ${user.email} === ${email} && ${user.password} === ${password}`);
            return user.email === email && user.password === password;
          });

          if (!user) {
            logger.warn(`Failed login attempt for email: ${email}`);
            return {
              data: null,
              error: {
                message: 'Invalid login credentials',
                status: 401
              }
            };
          }

          logger.info(`Mock user logged in: ${email} (${user.id})`);

          return {
            data: {
              user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                user_metadata: user.user_metadata
              }
            },
            error: null
          };
        }
      },
      from: (table) => {
        if (table === 'users') {
          return {
            insert: (userData) => ({
              select: () => ({
                single: () => {
                  const user = userData[0];
                  const userId = user.id;

                  // Store profile in mock database
                  mockProfiles.set(userId, user);
                  logger.info(`Mock profile created for user: ${userId}`);

                  return {
                    data: user,
                    error: null
                  };
                }
              })
            }),
            select: (columns) => ({
              eq: (field, value) => ({
                single: () => {
                  // Find profile by ID
                  const profile = mockProfiles.get(value);

                  if (!profile) {
                    // If no profile exists but user does, create a default profile
                    const user = mockUsers.get(value);
                    if (user) {
                      const defaultProfile = {
                        id: value,
                        email: user.email,
                        full_name: user.user_metadata?.full_name || 'User',
                        created_at: user.created_at,
                        last_sign_in: new Date().toISOString()
                      };

                      mockProfiles.set(value, defaultProfile);
                      logger.info(`Created default profile for user: ${value}`);

                      return {
                        data: defaultProfile,
                        error: null
                      };
                    }

                    return {
                      data: null,
                      error: {
                        message: 'Profile not found',
                        status: 404
                      }
                    };
                  }

                  return {
                    data: profile,
                    error: null
                  };
                }
              })
            }),
            update: (updateData) => ({
              eq: (field, value) => {
                // Update profile
                const profile = mockProfiles.get(value);

                if (profile) {
                  const updatedProfile = { ...profile, ...updateData };
                  mockProfiles.set(value, updatedProfile);
                  logger.info(`Updated profile for user: ${value}`);

                  return {
                    data: updatedProfile,
                    error: null
                  };
                }

                return {
                  data: null,
                  error: {
                    message: 'Profile not found',
                    status: 404
                  }
                };
              }
            })
          };
        }

        // Default table handler
        return {
          insert: () => ({
            select: () => ({
              single: () => ({
                data: null,
                error: {
                  message: `Table '${table}' not implemented in mock client`,
                  status: 501
                }
              })
            })
          }),
          select: () => ({
            eq: () => ({
              single: () => ({
                data: null,
                error: {
                  message: `Table '${table}' not implemented in mock client`,
                  status: 501
                }
              })
            })
          }),
          update: () => ({
            eq: () => ({
              data: null,
              error: {
                message: `Table '${table}' not implemented in mock client`,
                status: 501
              }
            })
          })
        };
      }
    };

    // Add some test users for development
    const testUser = {
      id: 'user_test123',
      email: 'test@example.com',
      password: 'password123',
      created_at: new Date().toISOString(),
      user_metadata: { full_name: 'Test User' }
    };

    mockUsers.set(testUser.id, testUser);
    mockProfiles.set(testUser.id, {
      id: testUser.id,
      email: testUser.email,
      full_name: 'Test User',
      created_at: testUser.created_at,
      last_sign_in: new Date().toISOString()
    });

    logger.info('Added test user: test@example.com / password123');
  }
} catch (error) {
  logger.error('Error initializing Supabase client:', error);
}

module.exports = supabase;
