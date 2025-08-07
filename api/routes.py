"""
API routes for the Video2Tool application.
"""

import os
import logging
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, EmailStr
from enum import Enum
from fastapi.responses import FileResponse

from video_processor.processor import VideoProcessor
from prompt_engineering.prompt_generator import PromptGenerator
from task_generation.task_creator import TaskCreator
from utils.queue_manager import QueueManager
from utils.supabase_client import SupabaseClient
from utils.export_manager import ExportManager, ExportFormat
from integrations.integration_manager import IntegrationManager, IntegrationType
from api.auth import get_current_user, get_optional_user, register_user, login_user
from models.database import User, UserCreate, Project, ProjectCreate, VideoAnalysis, VideoAnalysisCreate, Token, Specification, Task

logger = logging.getLogger(__name__)

# Initialize clients
supabase_client = SupabaseClient()
export_manager = ExportManager()
integration_manager = IntegrationManager()

# Models
class ProcessVideoRequest(BaseModel):
    video_url: Optional[str] = Field(None, description="URL of the video to process")
    project_id: Optional[str] = Field(None, description="Project ID to associate with the video")

class ExportRequest(BaseModel):
    format: ExportFormat = Field(..., description="Export format")
    filename: Optional[str] = Field(None, description="Output filename (without extension)")
    include_metadata: bool = Field(True, description="Whether to include metadata in the export")

class IntegrationAuthRequest(BaseModel):
    integration_type: IntegrationType = Field(..., description="Type of integration")
    api_key: Optional[str] = Field(None, description="API key for authentication")
    api_token: Optional[str] = Field(None, description="API token for authentication")

class CreateProjectRequest(BaseModel):
    integration_type: IntegrationType = Field(..., description="Type of integration")
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")

class CreateTaskRequest(BaseModel):
    integration_type: IntegrationType = Field(..., description="Type of integration")
    project_id: str = Field(..., description="Project ID")
    name: str = Field(..., description="Task name")
    description: Optional[str] = Field(None, description="Task description")
    additional_params: Optional[Dict[str, Any]] = Field(None, description="Additional task parameters")

class CreateTasksRequest(BaseModel):
    integration_type: IntegrationType = Field(..., description="Type of integration")
    project_id: str = Field(..., description="Project ID")
    tasks: List[Dict[str, Any]] = Field(..., description="List of task data")

class ProcessVideoResponse(BaseModel):
    task_id: str = Field(..., description="ID of the processing task")
    message: str = Field(..., description="Status message")

class TaskStatusResponse(BaseModel):
    id: str = Field(..., description="Task ID")
    status: str = Field(..., description="Task status")
    type: str = Field(..., description="Task type")
    created_at: float = Field(..., description="Creation timestamp")
    started_at: Optional[float] = Field(None, description="Start timestamp")
    completed_at: Optional[float] = Field(None, description="Completion timestamp")
    result: Optional[Dict[str, Any]] = Field(None, description="Task result")
    error: Optional[str] = Field(None, description="Error message if task failed")

# Create routers
router = APIRouter()
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
projects_router = APIRouter(prefix="/projects", tags=["Projects"])
videos_router = APIRouter(prefix="/videos", tags=["Videos"])
specs_router = APIRouter(prefix="/specifications", tags=["Specifications"])
tasks_router = APIRouter(prefix="/tasks", tags=["Tasks"])
export_router = APIRouter(prefix="/export", tags=["Export"])
integrations_router = APIRouter(prefix="/integrations", tags=["Integrations"])

# Queue manager
queue_manager = QueueManager(num_workers=2)

# Initialize processors
video_processor = VideoProcessor()
prompt_generator = PromptGenerator()
task_creator = TaskCreator()

# Register task handlers
async def process_video_handler(data: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for video processing tasks."""
    video_path = data.get("video_path")
    if not video_path:
        raise ValueError("Video path not provided")

    # Process the video
    result = video_processor.process_video(video_path)

    # Update video analysis record if available
    video_analysis_id = data.get("video_analysis_id")
    if video_analysis_id:
        try:
            await supabase_client.update_video_analysis(
                analysis_id=video_analysis_id,
                status="completed",
                transcription=result.get("transcription"),
                visual_elements=result.get("visual_elements"),
                summary=result.get("summary"),
                metadata=result.get("metadata")
            )
        except Exception as e:
            logger.error(f"Error updating video analysis record: {e}")

    return result

async def generate_specification_handler(data: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for specification generation tasks."""
    video_analysis = data.get("video_analysis")
    if not video_analysis:
        raise ValueError("Video analysis not provided")

    # Generate specification
    result = prompt_generator.generate_specification(video_analysis)

    # Update specification record if available
    specification_id = data.get("specification_id")
    if specification_id:
        try:
            await supabase_client.update_specification(
                spec_id=specification_id,
                status="completed",
                content=result
            )
        except Exception as e:
            logger.error(f"Error updating specification record: {e}")

    return result

async def create_tasks_handler(data: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for task creation tasks."""
    specification = data.get("specification")
    if not specification:
        raise ValueError("Specification not provided")

    # Create tasks
    result = task_creator.create_tasks(specification)

    # Store tasks in database if specification_id is available
    specification_id = data.get("specification_id")
    if specification_id:
        try:
            tasks = result.get("tasks", [])
            for task in tasks:
                await supabase_client.create_task(
                    specification_id=specification_id,
                    name=task.get("name", ""),
                    description=task.get("description", ""),
                    category=task.get("category", ""),
                    priority=task.get("priority", "Medium"),
                    estimate=task.get("estimate", ""),
                    dependencies=task.get("dependencies", [])
                )
        except Exception as e:
            logger.error(f"Error storing tasks in database: {e}")

    return result

# Register handlers
queue_manager.register_handler("process_video", process_video_handler)
queue_manager.register_handler("generate_specification", generate_specification_handler)
queue_manager.register_handler("create_tasks", create_tasks_handler)

# Start the queue manager
queue_manager.start()

# Authentication routes
@auth_router.post("/register", response_model=User)
async def register(user_data: UserCreate):
    """
    Register a new user.
    """
    return await register_user(user_data.email, user_data.password, user_data.full_name)

@auth_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Get an access token.
    """
    user_data = await login_user(form_data)
    return {
        "access_token": user_data["access_token"],
        "token_type": user_data["token_type"]
    }

@auth_router.get("/me", response_model=User)
async def get_user_me(current_user: User = Depends(get_current_user)):
    """
    Get the current user.
    """
    return current_user

# Project routes
@projects_router.post("", response_model=Project)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new project.
    """
    return await supabase_client.create_project(current_user.id, project_data.name, project_data.description)

@projects_router.get("", response_model=List[Project])
async def get_projects(current_user: User = Depends(get_current_user)):
    """
    Get all projects for the current user.
    """
    return await supabase_client.get_user_projects(current_user.id)

@projects_router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a project by ID.
    """
    project = await supabase_client.get_project(project_id)

    # Check if the project belongs to the current user
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")

    return project

# Video routes
@router.post("/upload", response_model=ProcessVideoResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Upload and process a video file.
    """
    try:
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            # Write the uploaded file to the temporary file
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Create a video analysis record if project_id is provided
        video_analysis_id = None
        if project_id and current_user:
            # Verify the project belongs to the user
            project = await supabase_client.get_project(project_id)
            if project.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to access this project")

            # Create video analysis
            video_analysis = await supabase_client.create_video_analysis(
                project_id=project_id,
                video_name=file.filename,
                video_file_path=temp_file_path
            )
            video_analysis_id = video_analysis.id

        # Enqueue the video processing task
        task_data = {
            "video_path": temp_file_path,
            "video_analysis_id": video_analysis_id
        }
        task_id = queue_manager.enqueue_task("process_video", task_data)

        # Add a background task to clean up the temporary file after processing
        def cleanup_temp_file():
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.error(f"Error cleaning up temporary file: {e}")

        background_tasks.add_task(cleanup_temp_file)

        return {
            "task_id": task_id,
            "message": "Video uploaded and processing started",
            "video_analysis_id": video_analysis_id
        }
    except Exception as e:
        logger.error(f"Error uploading video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-url", response_model=ProcessVideoResponse)
async def process_video_url(
    request: ProcessVideoRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Process a video from a URL.
    """
    try:
        if not request.video_url:
            raise HTTPException(status_code=400, detail="Video URL is required")

        # Import here to avoid circular imports
        from utils.video_downloader import VideoDownloader

        # Download the video
        downloader = VideoDownloader()
        video_path, video_name = await downloader.download_video(request.video_url)

        # Create a video analysis record if project_id is provided
        video_analysis_id = None
        if request.project_id and current_user:
            # Verify the project belongs to the user
            project = await supabase_client.get_project(request.project_id)
            if project.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to access this project")

            # Create video analysis
            video_analysis = await supabase_client.create_video_analysis(
                project_id=request.project_id,
                video_name=video_name,
                video_url=request.video_url,
                video_file_path=video_path
            )
            video_analysis_id = video_analysis.id

        # Enqueue the video processing task
        task_data = {
            "video_path": video_path,
            "video_analysis_id": video_analysis_id
        }
        task_id = queue_manager.enqueue_task("process_video", task_data)

        # Add a background task to clean up the temporary file after processing
        def cleanup_temp_file():
            try:
                os.unlink(video_path)
            except Exception as e:
                logger.error(f"Error cleaning up temporary file: {e}")

        background_tasks.add_task(cleanup_temp_file)

        return {
            "task_id": task_id,
            "message": "Video URL processing started",
            "video_analysis_id": video_analysis_id
        }
    except ValueError as e:
        logger.error(f"Error processing video URL: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing video URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get the status of a task.
    """
    try:
        status = queue_manager.get_task_status(task_id)
        if "error" in status and status["error"].startswith("Task not found"):
            raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Video analysis routes
@videos_router.get("", response_model=List[VideoAnalysis])
async def get_video_analyses(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get all video analyses for a project.
    """
    # Verify the project belongs to the user
    project = await supabase_client.get_project(project_id)
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")

    return await supabase_client.get_project_video_analyses(project_id)

@videos_router.get("/{analysis_id}", response_model=VideoAnalysis)
async def get_video_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a video analysis by ID.
    """
    analysis = await supabase_client.get_video_analysis(analysis_id)

    # Verify the analysis belongs to a project owned by the user
    project = await supabase_client.get_project(analysis.project_id)
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this video analysis")

    return analysis

@router.post("/generate-specification/{video_task_id}", response_model=ProcessVideoResponse)
async def generate_specification(
    video_task_id: str,
    title: Optional[str] = Form("Software Specification"),
    description: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Generate a software specification from video analysis.
    """
    try:
        # Get the video processing task
        video_task = queue_manager.get_task_status(video_task_id)
        if "error" in video_task and video_task["error"].startswith("Task not found"):
            raise HTTPException(status_code=404, detail=f"Video task not found: {video_task_id}")

        if video_task["status"] != "completed":
            raise HTTPException(status_code=400, detail=f"Video task is not completed: {video_task_id}")

        # Create specification record if video_analysis_id is available
        specification_id = None
        video_analysis_id = video_task.get("data", {}).get("video_analysis_id")

        if video_analysis_id and current_user:
            # Get the video analysis
            video_analysis = await supabase_client.get_video_analysis(video_analysis_id)

            # Verify the project belongs to the user
            project = await supabase_client.get_project(video_analysis.project_id)
            if project.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to access this project")

            # Create specification
            specification = await supabase_client.create_specification(
                video_analysis_id=video_analysis_id,
                title=title,
                description=description
            )
            specification_id = specification.id

        # Enqueue the specification generation task
        task_data = {
            "video_analysis": video_task["result"],
            "specification_id": specification_id
        }
        task_id = queue_manager.enqueue_task("generate_specification", task_data)

        return {
            "task_id": task_id,
            "message": "Specification generation started"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating specification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Specification routes
@specs_router.get("", response_model=List[Specification])
async def get_specifications(
    video_analysis_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get all specifications for a video analysis.
    """
    # Get the video analysis
    video_analysis = await supabase_client.get_video_analysis(video_analysis_id)

    # Verify the project belongs to the user
    project = await supabase_client.get_project(video_analysis.project_id)
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this video analysis")

    # TODO: Implement get_video_analysis_specifications in supabase_client
    # return await supabase_client.get_video_analysis_specifications(video_analysis_id)

    # Temporary placeholder
    return []

@specs_router.get("/{spec_id}", response_model=Specification)
async def get_specification(
    spec_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specification by ID.
    """
    specification = await supabase_client.get_specification(spec_id)

    # Get the video analysis
    video_analysis = await supabase_client.get_video_analysis(specification.video_analysis_id)

    # Verify the project belongs to the user
    project = await supabase_client.get_project(video_analysis.project_id)
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this specification")

    return specification

# Task routes
@tasks_router.get("", response_model=List[Task])
async def get_tasks(
    specification_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get all tasks for a specification.
    """
    # Get the specification
    specification = await supabase_client.get_specification(specification_id)

    # Get the video analysis
    video_analysis = await supabase_client.get_video_analysis(specification.video_analysis_id)

    # Verify the project belongs to the user
    project = await supabase_client.get_project(video_analysis.project_id)
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access these tasks")

    return await supabase_client.get_specification_tasks(specification_id)

# Export routes
@export_router.post("/specification/{spec_task_id}")
async def export_specification(
    spec_task_id: str,
    request: ExportRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Export a specification in the specified format.
    """
    try:
        # Get the specification task
        spec_task = queue_manager.get_task_status(spec_task_id)
        if "error" in spec_task and spec_task["error"].startswith("Task not found"):
            raise HTTPException(status_code=404, detail=f"Specification task not found: {spec_task_id}")

        if spec_task["status"] != "completed":
            raise HTTPException(status_code=400, detail=f"Specification task is not completed: {spec_task_id}")

        # Prepare export data
        export_data = {
            "title": "Software Specification",
            "specification": spec_task["result"]
        }

        # Add metadata if requested
        metadata = None
        if request.include_metadata:
            metadata = {
                "exported_at": datetime.now().isoformat(),
                "task_id": spec_task_id,
                "format": request.format.value
            }

            # Add user info if available
            if current_user:
                metadata["user_email"] = current_user.email
                metadata["user_id"] = current_user.id

        # Generate the export
        output_path = export_manager.export(
            data=export_data,
            format=request.format,
            filename=request.filename,
            metadata=metadata
        )

        # Return the file
        return FileResponse(
            path=output_path,
            filename=os.path.basename(output_path),
            media_type="application/octet-stream"
        )

    except ValueError as e:
        logger.error(f"Error exporting specification: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error exporting specification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@export_router.post("/tasks/{tasks_task_id}")
async def export_tasks(
    tasks_task_id: str,
    request: ExportRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Export tasks in the specified format.
    """
    try:
        # Get the tasks task
        tasks_task = queue_manager.get_task_status(tasks_task_id)
        if "error" in tasks_task and tasks_task["error"].startswith("Task not found"):
            raise HTTPException(status_code=404, detail=f"Tasks task not found: {tasks_task_id}")

        if tasks_task["status"] != "completed":
            raise HTTPException(status_code=400, detail=f"Tasks task is not completed: {tasks_task_id}")

        # Prepare export data
        export_data = {
            "title": "Development Tasks",
            "tasks": tasks_task["result"]
        }

        # Add metadata if requested
        metadata = None
        if request.include_metadata:
            metadata = {
                "exported_at": datetime.now().isoformat(),
                "task_id": tasks_task_id,
                "format": request.format.value
            }

            # Add user info if available
            if current_user:
                metadata["user_email"] = current_user.email
                metadata["user_id"] = current_user.id

        # Generate the export
        output_path = export_manager.export(
            data=export_data,
            format=request.format,
            filename=request.filename,
            metadata=metadata
        )

        # Return the file
        return FileResponse(
            path=output_path,
            filename=os.path.basename(output_path),
            media_type="application/octet-stream"
        )

    except ValueError as e:
        logger.error(f"Error exporting tasks: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error exporting tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@export_router.post("/complete/{spec_task_id}/{tasks_task_id}")
async def export_complete(
    spec_task_id: str,
    tasks_task_id: str,
    request: ExportRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Export complete analysis including specification and tasks.
    """
    try:
        # Get the specification task
        spec_task = queue_manager.get_task_status(spec_task_id)
        if "error" in spec_task and spec_task["error"].startswith("Task not found"):
            raise HTTPException(status_code=404, detail=f"Specification task not found: {spec_task_id}")

        if spec_task["status"] != "completed":
            raise HTTPException(status_code=400, detail=f"Specification task is not completed: {spec_task_id}")

        # Get the tasks task
        tasks_task = queue_manager.get_task_status(tasks_task_id)
        if "error" in tasks_task and tasks_task["error"].startswith("Task not found"):
            raise HTTPException(status_code=404, detail=f"Tasks task not found: {tasks_task_id}")

        if tasks_task["status"] != "completed":
            raise HTTPException(status_code=400, detail=f"Tasks task is not completed: {tasks_task_id}")

        # Get the video task ID from the spec task data
        video_task_id = spec_task.get("data", {}).get("video_task_id")

        # Get the video task if available
        summary = None
        if video_task_id:
            try:
                video_task = queue_manager.get_task_status(video_task_id)
                if video_task["status"] == "completed":
                    summary = video_task["result"].get("summary")
            except Exception as e:
                logger.warning(f"Error getting video task: {e}")

        # Prepare export data
        export_data = {
            "title": "Software Development Plan",
            "specification": spec_task["result"],
            "tasks": tasks_task["result"]
        }

        if summary:
            export_data["summary"] = summary

        # Add metadata if requested
        metadata = None
        if request.include_metadata:
            metadata = {
                "exported_at": datetime.now().isoformat(),
                "specification_task_id": spec_task_id,
                "tasks_task_id": tasks_task_id,
                "format": request.format.value
            }

            # Add user info if available
            if current_user:
                metadata["user_email"] = current_user.email
                metadata["user_id"] = current_user.id

        # Generate the export
        output_path = export_manager.export(
            data=export_data,
            format=request.format,
            filename=request.filename or "software_development_plan",
            metadata=metadata
        )

        # Return the file
        return FileResponse(
            path=output_path,
            filename=os.path.basename(output_path),
            media_type="application/octet-stream"
        )

    except ValueError as e:
        logger.error(f"Error exporting complete analysis: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error exporting complete analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Integration routes
@integrations_router.get("/types", response_model=List[str])
async def get_integration_types():
    """
    Get available integration types.
    """
    return [t.value for t in integration_manager.get_available_integrations()]

@integrations_router.post("/auth", response_model=Dict[str, bool])
async def authenticate_integration(request: IntegrationAuthRequest):
    """
    Authenticate with an integration.
    """
    try:
        success = await integration_manager.initialize_client(
            integration_type=request.integration_type,
            api_key=request.api_key,
            api_token=request.api_token
        )

        return {"success": success}

    except Exception as e:
        logger.error(f"Error authenticating with integration: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@integrations_router.get("/initialized", response_model=List[str])
async def get_initialized_integrations():
    """
    Get initialized integration types.
    """
    return [t.value for t in integration_manager.get_initialized_integrations()]

@integrations_router.post("/projects", response_model=Dict[str, Any])
async def create_integration_project(request: CreateProjectRequest):
    """
    Create a new project in an integration.
    """
    try:
        project = await integration_manager.create_project(
            integration_type=request.integration_type,
            name=request.name,
            description=request.description
        )

        return project

    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@integrations_router.get("/projects", response_model=List[Dict[str, Any]])
async def get_integration_projects(integration_type: IntegrationType):
    """
    Get all projects for an integration.
    """
    try:
        projects = await integration_manager.get_projects(integration_type)

        return projects

    except Exception as e:
        logger.error(f"Error getting projects: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@integrations_router.post("/tasks", response_model=Dict[str, Any])
async def create_integration_task(request: CreateTaskRequest):
    """
    Create a new task in an integration.
    """
    try:
        additional_params = request.additional_params or {}

        task = await integration_manager.create_task(
            integration_type=request.integration_type,
            project_id=request.project_id,
            name=request.name,
            description=request.description,
            **additional_params
        )

        return task

    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@integrations_router.post("/tasks/batch", response_model=List[Dict[str, Any]])
async def create_integration_tasks(request: CreateTasksRequest):
    """
    Create multiple tasks in an integration.
    """
    try:
        tasks = await integration_manager.create_tasks(
            integration_type=request.integration_type,
            project_id=request.project_id,
            tasks=request.tasks
        )

        return tasks

    except Exception as e:
        logger.error(f"Error creating tasks: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@integrations_router.get("/tasks", response_model=List[Dict[str, Any]])
async def get_integration_tasks(integration_type: IntegrationType, project_id: str):
    """
    Get all tasks for a project in an integration.
    """
    try:
        tasks = await integration_manager.get_tasks(
            integration_type=integration_type,
            project_id=project_id
        )

        return tasks

    except Exception as e:
        logger.error(f"Error getting tasks: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@integrations_router.post("/export/{task_task_id}", response_model=Dict[str, Any])
async def export_to_integration(
    task_task_id: str,
    integration_type: IntegrationType,
    project_name: str,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Export tasks to an integration.
    """
    try:
        # Get the tasks task
        tasks_task = queue_manager.get_task_status(task_task_id)
        if "error" in tasks_task and tasks_task["error"].startswith("Task not found"):
            raise HTTPException(status_code=404, detail=f"Tasks task not found: {task_task_id}")

        if tasks_task["status"] != "completed":
            raise HTTPException(status_code=400, detail=f"Tasks task is not completed: {task_task_id}")

        # Create a project in the integration
        project = await integration_manager.create_project(
            integration_type=integration_type,
            name=project_name,
            description=f"Exported from Video2Tool - Task ID: {task_task_id}"
        )

        # Extract tasks from the result
        tasks_data = tasks_task["result"].get("tasks", [])

        # Format tasks for the integration
        formatted_tasks = []
        for task in tasks_data:
            formatted_task = {
                "name": task.get("name", ""),
                "description": task.get("description", ""),
                "category": task.get("category", ""),
                "priority": task.get("priority", "medium")
            }
            formatted_tasks.append(formatted_task)

        # Create tasks in the integration
        created_tasks = await integration_manager.create_tasks(
            integration_type=integration_type,
            project_id=project["id"],
            tasks=formatted_tasks
        )

        return {
            "project": project,
            "tasks": created_tasks,
            "task_count": len(created_tasks)
        }

    except Exception as e:
        logger.error(f"Error exporting to integration: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/create-tasks/{spec_task_id}", response_model=ProcessVideoResponse)
async def create_tasks(
    spec_task_id: str,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Create development tasks from a software specification.
    """
    try:
        # Get the specification task
        spec_task = queue_manager.get_task_status(spec_task_id)
        if "error" in spec_task and spec_task["error"].startswith("Task not found"):
            raise HTTPException(status_code=404, detail=f"Specification task not found: {spec_task_id}")

        if spec_task["status"] != "completed":
            raise HTTPException(status_code=400, detail=f"Specification task is not completed: {spec_task_id}")

        # Get specification_id if available
        specification_id = spec_task.get("data", {}).get("specification_id")

        # Enqueue the task creation task
        task_data = {
            "specification": spec_task["result"],
            "specification_id": specification_id
        }
        task_id = queue_manager.enqueue_task("create_tasks", task_data)

        return {
            "task_id": task_id,
            "message": "Task creation started"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks", response_model=List[TaskStatusResponse])
async def get_all_tasks():
    """
    Get all tasks.
    """
    try:
        return queue_manager.get_all_tasks()
    except Exception as e:
        logger.error(f"Error getting all tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))
