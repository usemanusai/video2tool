"""
Base integration client for project management tools.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class BaseIntegrationClient(ABC):
    """
    Abstract base class for project management tool integrations.
    
    All integration clients should inherit from this class and implement
    the required methods.
    """
    
    def __init__(self, api_key: Optional[str] = None, api_token: Optional[str] = None):
        """
        Initialize the integration client.
        
        Args:
            api_key: API key for authentication
            api_token: API token for authentication
        """
        self.api_key = api_key
        self.api_token = api_token
        self.is_authenticated = False
    
    @abstractmethod
    async def authenticate(self) -> bool:
        """
        Authenticate with the service.
        
        Returns:
            True if authentication was successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def create_project(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new project.
        
        Args:
            name: Project name
            description: Project description
            
        Returns:
            Project data
        """
        pass
    
    @abstractmethod
    async def create_task(self, 
                         project_id: str, 
                         name: str, 
                         description: Optional[str] = None,
                         **kwargs) -> Dict[str, Any]:
        """
        Create a new task.
        
        Args:
            project_id: Project ID
            name: Task name
            description: Task description
            **kwargs: Additional task parameters
            
        Returns:
            Task data
        """
        pass
    
    @abstractmethod
    async def create_tasks(self, 
                          project_id: str, 
                          tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Create multiple tasks.
        
        Args:
            project_id: Project ID
            tasks: List of task data
            
        Returns:
            List of created task data
        """
        pass
    
    @abstractmethod
    async def get_projects(self) -> List[Dict[str, Any]]:
        """
        Get all projects.
        
        Returns:
            List of project data
        """
        pass
    
    @abstractmethod
    async def get_tasks(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Get all tasks for a project.
        
        Args:
            project_id: Project ID
            
        Returns:
            List of task data
        """
        pass
    
    @abstractmethod
    async def update_task(self, 
                         project_id: str, 
                         task_id: str, 
                         **kwargs) -> Dict[str, Any]:
        """
        Update a task.
        
        Args:
            project_id: Project ID
            task_id: Task ID
            **kwargs: Task fields to update
            
        Returns:
            Updated task data
        """
        pass
    
    @abstractmethod
    async def get_task_url(self, project_id: str, task_id: str) -> str:
        """
        Get the URL for a task.
        
        Args:
            project_id: Project ID
            task_id: Task ID
            
        Returns:
            Task URL
        """
        pass
    
    @abstractmethod
    async def get_project_url(self, project_id: str) -> str:
        """
        Get the URL for a project.
        
        Args:
            project_id: Project ID
            
        Returns:
            Project URL
        """
        pass
