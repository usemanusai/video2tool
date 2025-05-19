const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 8000,
    env: process.env.NODE_ENV || 'development',
  },
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
  },
  
  // OpenRouter.ai API configuration
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultModel: process.env.DEFAULT_MODEL || 'anthropic/claude-3-opus-20240229',
    fallbackModel: process.env.FALLBACK_MODEL || 'openai/gpt-4-turbo',
    maxTokensPerRequest: parseInt(process.env.MAX_TOKENS_PER_REQUEST || '16000', 10),
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '10', 10),
    rateLimitPeriod: parseInt(process.env.RATE_LIMIT_PERIOD || '60', 10),
  },
  
  // File storage configuration
  storage: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    tempDir: process.env.TEMP_DIR || './temp',
    outputDir: process.env.OUTPUT_DIR || './output',
  },
  
  // Memory optimization
  memory: {
    nodeMemoryLimit: parseInt(process.env.NODE_MEMORY_LIMIT || '2048', 10),
    queueConcurrency: parseInt(process.env.QUEUE_CONCURRENCY || '1', 10),
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
