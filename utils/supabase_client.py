"""
Supabase client for the Video2Tool application.
"""

import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta

from supabase import create_client, Client
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

import config
from models.database import User, Project, VideoAnalysis, Specification, Task

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


class SupabaseClient:
    """
    Client for interacting with Supabase.

    Handles:
    - Authentication
    - Database operations
    - Storage operations
    """

    def __init__(self):
        """Initialize the Supabase client."""
        self.url = config.SUPABASE_URL
        self.key = config.SUPABASE_KEY
        self.jwt_secret = config.SUPABASE_JWT_SECRET

        if not self.url or not self.key:
            logger.warning("Supabase URL or key not set. Authentication will not work.")
            self.client = None
        else:
            try:
                self.client = create_client(self.url, self.key)
                logger.info("Supabase client initialized")
            except Exception as e:
                logger.error(f"Error initializing Supabase client: {e}")
                self.client = None

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against a hash.

        Args:
            plain_password: Plain text password
            hashed_password: Hashed password

        Returns:
            True if the password matches the hash
        """
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """
        Hash a password.

        Args:
            password: Plain text password

        Returns:
            Hashed password
        """
        return pwd_context.hash(password)

    def create_access_token(self, data: Dict[str, Any]) -> str:
        """
        Create a JWT access token.

        Args:
            data: Data to encode in the token

        Returns:
            JWT token
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})

        return jwt.encode(to_encode, self.jwt_secret, algorithm=ALGORITHM)

    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify a JWT token.

        Args:
            token: JWT token

        Returns:
            Decoded token data

        Raises:
            HTTPException: If the token is invalid
        """
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # User operations

    async def register_user(self, email: str, password: str, full_name: Optional[str] = None) -> User:
        """
        Register a new user.

        Args:
            email: User email
            password: User password
            full_name: User's full name

        Returns:
            User data

        Raises:
            HTTPException: If registration fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            # Register with Supabase Auth
            auth_response = self.client.auth.sign_up({
                "email": email,
                "password": password
            })

            user_id = auth_response.user.id

            # Store additional user data in the database
            user_data = {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "created_at": datetime.utcnow().isoformat()
            }

            self.client.table("users").insert(user_data).execute()

            return User(**user_data)

        except Exception as e:
            logger.error(f"Error registering user: {e}")
            raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

    async def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """
        Login a user.

        Args:
            email: User email
            password: User password

        Returns:
            Dict containing user data and access token

        Raises:
            HTTPException: If login fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            # Login with Supabase Auth
            auth_response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

            user_id = auth_response.user.id

            # Update last sign in time
            self.client.table("users").update({
                "last_sign_in": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()

            # Get user data
            user_response = self.client.table("users").select("*").eq("id", user_id).execute()
            user_data = user_response.data[0]

            # Create access token
            access_token = self.create_access_token({"sub": user_id})

            return {
                "user": User(**user_data),
                "access_token": access_token,
                "token_type": "bearer"
            }

        except Exception as e:
            logger.error(f"Error logging in user: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Project operations

    async def create_project(self, user_id: str, name: str, description: Optional[str] = None) -> Project:
        """
        Create a new project.

        Args:
            user_id: User ID
            name: Project name
            description: Project description

        Returns:
            Project data

        Raises:
            HTTPException: If project creation fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            # Create project
            project_data = {
                "user_id": user_id,
                "name": name,
                "description": description,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }

            response = self.client.table("projects").insert(project_data).execute()

            return Project(**response.data[0])

        except Exception as e:
            logger.error(f"Error creating project: {e}")
            raise HTTPException(status_code=400, detail=f"Project creation failed: {str(e)}")

    async def get_user_projects(self, user_id: str) -> List[Project]:
        """
        Get all projects for a user.

        Args:
            user_id: User ID

        Returns:
            List of projects

        Raises:
            HTTPException: If fetching projects fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            response = self.client.table("projects").select("*").eq("user_id", user_id).execute()

            return [Project(**project) for project in response.data]

        except Exception as e:
            logger.error(f"Error fetching projects: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to fetch projects: {str(e)}")

    async def get_project(self, project_id: str) -> Project:
        """
        Get a project by ID.

        Args:
            project_id: Project ID

        Returns:
            Project data

        Raises:
            HTTPException: If project not found
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            response = self.client.table("projects").select("*").eq("id", project_id).execute()

            if not response.data:
                raise HTTPException(status_code=404, detail="Project not found")

            return Project(**response.data[0])

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching project: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to fetch project: {str(e)}")

    # Video analysis operations

    async def create_video_analysis(
        self,
        project_id: str,
        video_name: str,
        video_url: Optional[str] = None,
        video_file_path: Optional[str] = None
    ) -> VideoAnalysis:
        """
        Create a new video analysis.

        Args:
            project_id: Project ID
            video_name: Video name
            video_url: Video URL
            video_file_path: Video file path

        Returns:
            VideoAnalysis data

        Raises:
            HTTPException: If video analysis creation fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            # Create video analysis
            analysis_data = {
                "project_id": project_id,
                "video_name": video_name,
                "video_url": video_url,
                "video_file_path": video_file_path,
                "created_at": datetime.utcnow().isoformat(),
                "status": "pending"
            }

            response = self.client.table("video_analyses").insert(analysis_data).execute()

            return VideoAnalysis(**response.data[0])

        except Exception as e:
            logger.error(f"Error creating video analysis: {e}")
            raise HTTPException(status_code=400, detail=f"Video analysis creation failed: {str(e)}")

    async def update_video_analysis(
        self,
        analysis_id: str,
        status: Optional[str] = None,
        transcription: Optional[str] = None,
        visual_elements: Optional[Dict[str, Any]] = None,
        summary: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> VideoAnalysis:
        """
        Update a video analysis.

        Args:
            analysis_id: Video analysis ID
            status: Analysis status
            transcription: Transcription text
            visual_elements: Visual elements data
            summary: Summary data
            metadata: Metadata

        Returns:
            Updated VideoAnalysis data

        Raises:
            HTTPException: If update fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            # Build update data
            update_data = {}
            if status is not None:
                update_data["status"] = status
            if transcription is not None:
                update_data["transcription"] = transcription
            if visual_elements is not None:
                update_data["visual_elements"] = visual_elements
            if summary is not None:
                update_data["summary"] = summary
            if metadata is not None:
                update_data["metadata"] = metadata

            if not update_data:
                # Nothing to update
                return await self.get_video_analysis(analysis_id)

            response = self.client.table("video_analyses").update(update_data).eq("id", analysis_id).execute()

            if not response.data:
                raise HTTPException(status_code=404, detail="Video analysis not found")

            return VideoAnalysis(**response.data[0])

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating video analysis: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to update video analysis: {str(e)}")

    async def get_video_analysis(self, analysis_id: str) -> VideoAnalysis:
        """
        Get a video analysis by ID.

        Args:
            analysis_id: Video analysis ID

        Returns:
            VideoAnalysis data

        Raises:
            HTTPException: If video analysis not found
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            response = self.client.table("video_analyses").select("*").eq("id", analysis_id).execute()

            if not response.data:
                raise HTTPException(status_code=404, detail="Video analysis not found")

            return VideoAnalysis(**response.data[0])

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching video analysis: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to fetch video analysis: {str(e)}")

    async def get_project_video_analyses(self, project_id: str) -> List[VideoAnalysis]:
        """
        Get all video analyses for a project.

        Args:
            project_id: Project ID

        Returns:
            List of video analyses

        Raises:
            HTTPException: If fetching video analyses fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            response = self.client.table("video_analyses").select("*").eq("project_id", project_id).execute()

            return [VideoAnalysis(**analysis) for analysis in response.data]

        except Exception as e:
            logger.error(f"Error fetching video analyses: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to fetch video analyses: {str(e)}")

    # Specification operations

    async def create_specification(
        self,
        video_analysis_id: str,
        title: str,
        description: Optional[str] = None
    ) -> Specification:
        """
        Create a new specification.

        Args:
            video_analysis_id: Video analysis ID
            title: Specification title
            description: Specification description

        Returns:
            Specification data

        Raises:
            HTTPException: If specification creation fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            # Create specification
            spec_data = {
                "video_analysis_id": video_analysis_id,
                "title": title,
                "description": description,
                "created_at": datetime.utcnow().isoformat(),
                "status": "pending"
            }

            response = self.client.table("specifications").insert(spec_data).execute()

            return Specification(**response.data[0])

        except Exception as e:
            logger.error(f"Error creating specification: {e}")
            raise HTTPException(status_code=400, detail=f"Specification creation failed: {str(e)}")

    async def update_specification(
        self,
        spec_id: str,
        status: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None
    ) -> Specification:
        """
        Update a specification.

        Args:
            spec_id: Specification ID
            status: Specification status
            content: Specification content

        Returns:
            Updated Specification data

        Raises:
            HTTPException: If update fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            # Build update data
            update_data = {}
            if status is not None:
                update_data["status"] = status
            if content is not None:
                update_data["content"] = content

            if not update_data:
                # Nothing to update
                return await self.get_specification(spec_id)

            response = self.client.table("specifications").update(update_data).eq("id", spec_id).execute()

            if not response.data:
                raise HTTPException(status_code=404, detail="Specification not found")

            return Specification(**response.data[0])

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating specification: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to update specification: {str(e)}")

    async def get_specification(self, spec_id: str) -> Specification:
        """
        Get a specification by ID.

        Args:
            spec_id: Specification ID

        Returns:
            Specification data

        Raises:
            HTTPException: If specification not found
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            response = self.client.table("specifications").select("*").eq("id", spec_id).execute()

            if not response.data:
                raise HTTPException(status_code=404, detail="Specification not found")

            return Specification(**response.data[0])

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching specification: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to fetch specification: {str(e)}")

    # Task operations

    async def create_task(
        self,
        specification_id: str,
        name: str,
        description: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        estimate: Optional[str] = None,
        dependencies: Optional[List[str]] = None
    ) -> Task:
        """
        Create a new task.

        Args:
            specification_id: Specification ID
            name: Task name
            description: Task description
            category: Task category
            priority: Task priority
            estimate: Time estimate
            dependencies: List of task IDs this task depends on

        Returns:
            Task data

        Raises:
            HTTPException: If task creation fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            # Create task
            task_data = {
                "specification_id": specification_id,
                "name": name,
                "description": description,
                "category": category,
                "priority": priority,
                "estimate": estimate,
                "dependencies": dependencies,
                "created_at": datetime.utcnow().isoformat()
            }

            response = self.client.table("tasks").insert(task_data).execute()

            return Task(**response.data[0])

        except Exception as e:
            logger.error(f"Error creating task: {e}")
            raise HTTPException(status_code=400, detail=f"Task creation failed: {str(e)}")

    async def get_specification_tasks(self, specification_id: str) -> List[Task]:
        """
        Get all tasks for a specification.

        Args:
            specification_id: Specification ID

        Returns:
            List of tasks

        Raises:
            HTTPException: If fetching tasks fails
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")

        try:
            response = self.client.table("tasks").select("*").eq("specification_id", specification_id).execute()

            return [Task(**task) for task in response.data]

        except Exception as e:
            logger.error(f"Error fetching tasks: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to fetch tasks: {str(e)}")
"""
