"""
Authentication module for the Video2Tool application.
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import ValidationError

from utils.supabase_client import SupabaseClient
from models.database import User, TokenData

logger = logging.getLogger(__name__)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# Initialize Supabase client
supabase_client = SupabaseClient()


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Get the current authenticated user.
    
    Args:
        token: JWT token
        
    Returns:
        User data
        
    Raises:
        HTTPException: If authentication fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Verify token
        payload = supabase_client.verify_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        token_data = TokenData(user_id=user_id)
    except (JWTError, ValidationError):
        raise credentials_exception
    
    # Get user from database
    try:
        response = supabase_client.client.table("users").select("*").eq("id", token_data.user_id).execute()
        if not response.data:
            raise credentials_exception
        
        return User(**response.data[0])
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise credentials_exception


async def get_optional_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[User]:
    """
    Get the current authenticated user if available.
    
    Args:
        token: JWT token
        
    Returns:
        User data or None
    """
    if not token:
        return None
    
    try:
        return await get_current_user(token)
    except HTTPException:
        return None


async def register_user(email: str, password: str, full_name: Optional[str] = None) -> User:
    """
    Register a new user.
    
    Args:
        email: User email
        password: User password
        full_name: User's full name
        
    Returns:
        User data
    """
    return await supabase_client.register_user(email, password, full_name)


async def login_user(form_data: OAuth2PasswordRequestForm) -> dict:
    """
    Login a user.
    
    Args:
        form_data: OAuth2 form data
        
    Returns:
        Dict containing user data and access token
    """
    return await supabase_client.login_user(form_data.username, form_data.password)
"""
