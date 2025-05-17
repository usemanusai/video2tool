"""
Middleware for the Video2Tool API.
"""

import time
import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging API requests and responses.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process a request and log information about it.
        
        Args:
            request: The incoming request
            call_next: Function to call the next middleware or route handler
            
        Returns:
            The response
        """
        # Generate a request ID
        request_id = f"{time.time():.0f}"
        
        # Log the request
        logger.info(f"Request {request_id}: {request.method} {request.url.path}")
        
        # Record the start time
        start_time = time.time()
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Calculate the processing time
            process_time = time.time() - start_time
            
            # Log the response
            logger.info(f"Response {request_id}: {response.status_code} ({process_time:.3f}s)")
            
            # Add custom headers
            response.headers["X-Process-Time"] = f"{process_time:.3f}"
            
            return response
        except Exception as e:
            # Log the error
            logger.error(f"Error {request_id}: {str(e)}")
            
            # Re-raise the exception
            raise

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware for rate limiting API requests.
    """
    
    def __init__(self, app, requests_per_minute: int = 60):
        """
        Initialize the RateLimitMiddleware.
        
        Args:
            app: The FastAPI application
            requests_per_minute: Maximum requests per minute
        """
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_timestamps = {}  # IP -> list of timestamps
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process a request and apply rate limiting.
        
        Args:
            request: The incoming request
            call_next: Function to call the next middleware or route handler
            
        Returns:
            The response
        """
        # Get the client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Check if the client is rate limited
        if self._is_rate_limited(client_ip):
            # Return a rate limit response
            return Response(
                content="Rate limit exceeded. Please try again later.",
                status_code=429,
                media_type="text/plain"
            )
        
        # Process the request
        return await call_next(request)
    
    def _is_rate_limited(self, client_ip: str) -> bool:
        """
        Check if a client is rate limited.
        
        Args:
            client_ip: Client IP address
            
        Returns:
            True if rate limited, False otherwise
        """
        current_time = time.time()
        
        # Initialize timestamps for this client if needed
        if client_ip not in self.request_timestamps:
            self.request_timestamps[client_ip] = []
        
        # Remove timestamps older than 1 minute
        self.request_timestamps[client_ip] = [
            ts for ts in self.request_timestamps[client_ip]
            if current_time - ts < 60
        ]
        
        # Check if the client has exceeded the rate limit
        if len(self.request_timestamps[client_ip]) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return True
        
        # Add the current timestamp
        self.request_timestamps[client_ip].append(current_time)
        
        return False
