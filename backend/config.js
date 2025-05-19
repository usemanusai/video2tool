/**
 * Configuration for the backend server
 */
require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 8000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },

  // Queue configuration
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '1', 10),
  },

  // Memory configuration
  memory: {
    queueConcurrency: parseInt(process.env.QUEUE_CONCURRENCY || '1', 10),
    maxOldSpaceSize: parseInt(process.env.MAX_OLD_SPACE_SIZE || '2048', 10),
  },

  // API configuration
  api: {
    openrouter: {
      url: process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1',
      key: process.env.OPENROUTER_API_KEY,
    },
  },

  // Storage configuration
  storage: {
    uploads: process.env.UPLOAD_DIR || 'uploads',
  },
};
