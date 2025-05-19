const axios = require('axios');
const config = require('./index');
const logger = require('../utils/logger');

// Create OpenRouter client
const openRouter = {
  apiKey: config.openRouter.apiKey,
  baseUrl: config.openRouter.baseUrl,
  defaultModel: config.openRouter.defaultModel,
  fallbackModel: config.openRouter.fallbackModel,
  maxTokensPerRequest: config.openRouter.maxTokensPerRequest,
  rateLimitRequests: config.openRouter.rateLimitRequests,
  rateLimitPeriod: config.openRouter.rateLimitPeriod,
  
  // Request timestamps for rate limiting
  requestTimestamps: [],
  
  /**
   * Apply rate limiting
   * @returns {Promise<void>}
   */
  async applyRateLimit() {
    const now = Date.now();
    // Remove timestamps older than the rate limit period
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.rateLimitPeriod * 1000
    );
    
    // Check if we've hit the rate limit
    if (this.requestTimestamps.length >= this.rateLimitRequests) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = this.rateLimitPeriod * 1000 - (now - oldestTimestamp);
      
      if (waitTime > 0) {
        logger.info(`Rate limit reached. Waiting ${waitTime}ms before next request.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  },
  
  /**
   * Generate a completion using the OpenRouter API
   * @param {string} prompt - The prompt to send to the model
   * @param {string} systemPrompt - Optional system prompt
   * @param {string} model - Model to use (defaults to defaultModel)
   * @param {number} maxTokens - Maximum tokens to generate
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, systemPrompt = "", model = null, maxTokens = 1000) {
    if (!this.apiKey) {
      logger.error("OpenRouter API key not set");
      throw new Error("OpenRouter API key not set. Please set the OPENROUTER_API_KEY environment variable.");
    }
    
    // Apply rate limiting
    await this.applyRateLimit();
    
    // Use default model if none specified
    if (!model) {
      model = this.defaultModel;
    }
    
    // Prepare the request
    const url = `${this.baseUrl}/chat/completions`;
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
    
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });
    
    const data = {
      model: model,
      messages: messages,
      max_tokens: maxTokens
    };
    
    // Make the request with retries
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info(`Sending request to OpenRouter API (attempt ${attempt+1}/${maxRetries})`);
        
        // Record the request timestamp for rate limiting
        this.requestTimestamps.push(Date.now());
        
        const response = await axios.post(url, data, { headers, timeout: 60000 });
        
        return response.data.choices[0].message.content;
      } catch (error) {
        lastError = error;
        logger.error(`OpenRouter API error (attempt ${attempt+1}/${maxRetries}):`, error.message);
        
        // If we're not using the fallback model yet and this is the last attempt, try the fallback
        if (model !== this.fallbackModel && attempt === maxRetries - 1) {
          logger.info(`Trying fallback model: ${this.fallbackModel}`);
          return this.generateCompletion(prompt, systemPrompt, this.fallbackModel, maxTokens);
        }
        
        // Wait before retrying with exponential backoff
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // If we get here, all attempts failed
    throw lastError || new Error("Failed to generate completion after multiple attempts");
  }
};

module.exports = openRouter;
