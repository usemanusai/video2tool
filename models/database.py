"""
Database models for the Video2Tool application.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, EmailStr


class UserBase(BaseModel):
    """Base model for user data."""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Model for user creation."""
    password: str


class User(UserBase):
    """Model for user data."""
    id: str
    created_at: datetime
    last_sign_in: Optional[datetime] = None

    class Config:
        orm_mode = True


class ProjectBase(BaseModel):
    """Base model for project data."""
    name: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    """Model for project creation."""
    pass


class Project(ProjectBase):
    """Model for project data."""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class VideoAnalysisBase(BaseModel):
    """Base model for video analysis data."""
    video_name: str
    video_url: Optional[str] = None
    video_file_path: Optional[str] = None


class VideoAnalysisCreate(VideoAnalysisBase):
    """Model for video analysis creation."""
    project_id: str


class VideoAnalysis(VideoAnalysisBase):
    """Model for video analysis data."""
    id: str
    project_id: str
    created_at: datetime
    status: str = "pending"
    transcription: Optional[str] = None
    visual_elements: Optional[Dict[str, Any]] = None
    summary: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True


class SpecificationBase(BaseModel):
    """Base model for specification data."""
    title: str
    description: Optional[str] = None


class SpecificationCreate(SpecificationBase):
    """Model for specification creation."""
    video_analysis_id: str


class Specification(SpecificationBase):
    """Model for specification data."""
    id: str
    video_analysis_id: str
    created_at: datetime
    status: str = "pending"
    content: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True


class TaskBase(BaseModel):
    """Base model for task data."""
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    estimate: Optional[str] = None


class TaskCreate(TaskBase):
    """Model for task creation."""
    specification_id: str


class Task(TaskBase):
    """Model for task data."""
    id: str
    specification_id: str
    created_at: datetime
    dependencies: Optional[List[str]] = None
    notes: Optional[str] = None

    class Config:
        orm_mode = True


class Token(BaseModel):
    """Model for authentication token."""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Model for token data."""
    user_id: Optional[str] = None
