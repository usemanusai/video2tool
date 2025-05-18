const { createClient } = require('@supabase/supabase-js');
const config = require('./index');
const logger = require('../utils/logger');

// Create Supabase client
let supabase = null;

try {
  if (config.supabase.url && config.supabase.key) {
    supabase = createClient(config.supabase.url, config.supabase.key);
    logger.info('Supabase client initialized');
  } else {
    logger.warn('Supabase URL or key not set. Authentication will not work.');
  }
} catch (error) {
  logger.error('Error initializing Supabase client:', error);
}

module.exports = supabase;
