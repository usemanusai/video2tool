"""
Module for interacting with the OpenRouter.ai API.
"""

import logging
import time
from typing import Dict, List, Any, Optional

import httpx
import tiktoken

import config

logger = logging.getLogger(__name__)

class OpenRouterClient:
    """
    Client for interacting with the OpenRouter.ai API.
    
    Handles:
    - API authentication
    - Rate limiting
    - Retries
    - Token counting
    - Model fallbacks
    """
    
    def __init__(self):
        """Initialize the OpenRouterClient."""
        self.api_key = config.OPENROUTER_API_KEY
        self.default_model = config.DEFAULT_MODEL
        self.fallback_model = config.FALLBACK_MODEL
        
        self.max_tokens_per_request = config.MAX_TOKENS_PER_REQUEST
        self.rate_limit_requests = config.RATE_LIMIT_REQUESTS
        self.rate_limit_period = config.RATE_LIMIT_PERIOD
        
        # Rate limiting state
        self.request_timestamps = []
    
    def generate_completion(self, 
                           prompt: str, 
                           system_prompt: str = "", 
                           model: Optional[str] = None,
                           max_tokens: int = 1000) -> str:
        """
        Generate a completion using the OpenRouter API.
        
        Args:
            prompt: The prompt to send to the model
            system_prompt: Optional system prompt
            model: Model to use (defaults to self.default_model)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text
        """
        if not self.api_key:
            logger.error("OpenRouter API key not set")
            return "Error: OpenRouter API key not set. Please set the OPENROUTER_API_KEY environment variable."
        
        # Apply rate limiting
        self._apply_rate_limit()
        
        # Use default model if none specified
        if not model:
            model = self.default_model
        
        # Count tokens
        input_tokens = self._count_tokens(prompt) + self._count_tokens(system_prompt)
        if input_tokens > self.max_tokens_per_request:
            logger.warning(f"Input tokens ({input_tokens}) exceed maximum ({self.max_tokens_per_request})")
            # Truncate the prompt
            prompt = self._truncate_prompt(prompt, self.max_tokens_per_request - self._count_tokens(system_prompt) - 100)
        
        # Prepare the request
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        data = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens
        }
        
        # Make the request with retries
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Sending request to OpenRouter API (attempt {attempt+1}/{max_retries})")
                
                with httpx.Client(timeout=60.0) as client:
                    response = client.post(url, headers=headers, json=data)
                
                # Record the request timestamp for rate limiting
                self.request_timestamps.append(time.time())
                
                # Check for errors
                if response.status_code != 200:
                    error_msg = f"OpenRouter API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    
                    # If we're not using the fallback model yet, try that
                    if model != self.fallback_model and attempt == max_retries - 1:
                        logger.info(f"Trying fallback model: {self.fallback_model}")
                        return self.generate_completion(
                            prompt=prompt,
                            system_prompt=system_prompt,
                            model=self.fallback_model,
                            max_tokens=max_tokens
                        )
                    
                    # Wait before retrying
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                
                # Parse the response
                response_data = response.json()
                completion = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                logger.info(f"Received response from OpenRouter API: {len(completion)} characters")
                return completion
                
            except Exception as e:
                logger.error(f"Error calling OpenRouter API: {e}")
                
                # Wait before retrying
                time.sleep(2 ** attempt)  # Exponential backoff
        
        # If we get here, all attempts failed
        return "Error: Failed to generate completion after multiple attempts."
    
    def _apply_rate_limit(self):
        """
        Apply rate limiting to API requests.
        
        Waits if necessary to stay within rate limits.
        """
        # Remove timestamps older than the rate limit period
        current_time = time.time()
        self.request_timestamps = [ts for ts in self.request_timestamps 
                                 if current_time - ts < self.rate_limit_period]
        
        # Check if we've hit the rate limit
        if len(self.request_timestamps) >= self.rate_limit_requests:
            # Calculate how long to wait
            oldest_timestamp = min(self.request_timestamps)
            wait_time = self.rate_limit_period - (current_time - oldest_timestamp)
            
            if wait_time > 0:
                logger.info(f"Rate limit reached. Waiting {wait_time:.2f} seconds")
                time.sleep(wait_time)
    
    def _count_tokens(self, text: str) -> int:
        """
        Count the number of tokens in a text.
        
        Args:
            text: Input text
            
        Returns:
            Token count
        """
        try:
            encoding = tiktoken.encoding_for_model("gpt-4")
            return len(encoding.encode(text))
        except Exception as e:
            logger.error(f"Error counting tokens: {e}")
            # Fallback: estimate 1 token per 4 characters
            return len(text) // 4
    
    def _truncate_prompt(self, prompt: str, max_tokens: int) -> str:
        """
        Truncate a prompt to fit within token limits.
        
        Args:
            prompt: Input prompt
            max_tokens: Maximum tokens allowed
            
        Returns:
            Truncated prompt
        """
        try:
            encoding = tiktoken.encoding_for_model("gpt-4")
            tokens = encoding.encode(prompt)
            
            if len(tokens) <= max_tokens:
                return prompt
            
            truncated_tokens = tokens[:max_tokens]
            truncated_prompt = encoding.decode(truncated_tokens)
            
            return truncated_prompt + "\n\n[Content truncated due to token limits]"
        except Exception as e:
            logger.error(f"Error truncating prompt: {e}")
            # Fallback: estimate 4 characters per token
            max_chars = max_tokens * 4
            if len(prompt) <= max_chars:
                return prompt
            return prompt[:max_chars] + "\n\n[Content truncated due to token limits]"
