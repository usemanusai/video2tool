"""
Integration manager for project management tools.
"""

import logging
from enum import Enum
from typing import Dict, List, Any, Optional, Union

from integrations.base_client import BaseIntegrationClient
from integrations.trello_client import TrelloClient
from integrations.github_client import GitHubClient
from integrations.clickup_client import ClickUpClient

logger = logging.getLogger(__name__)

class IntegrationType(str, Enum):
    """Integration type enum."""
    TRELLO = "trello"
    GITHUB = "github"
    CLICKUP = "clickup"


class IntegrationManager:
    """
    Manager for project management tool integrations.
    
    This class provides a unified interface for working with different
    project management tools.
    """
    
    def __init__(self):
        """Initialize the integration manager."""
        self.clients: Dict[IntegrationType, BaseIntegrationClient] = {}
    
    async def initialize_client(self, 
                               integration_type: IntegrationType, 
                               api_key: Optional[str] = None,
                               api_token: Optional[str] = None) -> bool:
        """
        Initialize a client for a specific integration type.
        
        Args:
            integration_type: Type of integration
            api_key: API key for authentication
            api_token: API token for authentication
            
        Returns:
            True if initialization was successful, False otherwise
        """
        try:
            if integration_type == IntegrationType.TRELLO:
                client = TrelloClient(api_key=api_key, api_token=api_token)
            elif integration_type == IntegrationType.GITHUB:
                client = GitHubClient(api_token=api_token)
            elif integration_type == IntegrationType.CLICKUP:
                client = ClickUpClient(api_token=api_token)
            else:
                logger.error(f"Unsupported integration type: {integration_type}")
                return False
            
            # Authenticate the client
            if await client.authenticate():
                self.clients[integration_type] = client
                logger.info(f"Successfully initialized {integration_type} client")
                return True
            else:
                logger.error(f"Failed to authenticate {integration_type} client")
                return False
            
        except Exception as e:
            logger.error(f"Error initializing {integration_type} client: {e}")
            return False
    
    def get_client(self, integration_type: IntegrationType) -> Optional[BaseIntegrationClient]:
        """
        Get a client for a specific integration type.
        
        Args:
            integration_type: Type of integration
            
        Returns:
            Integration client or None if not initialized
        """
        return self.clients.get(integration_type)
    
    async def create_project(self, 
                            integration_type: IntegrationType, 
                            name: str, 
                            description: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new project in the specified integration.
        
        Args:
            integration_type: Type of integration
            name: Project name
            description: Project description
            
        Returns:
            Project data
            
        Raises:
            ValueError: If the client is not initialized or project creation fails
        """
        client = self.get_client(integration_type)
        if not client:
            raise ValueError(f"{integration_type} client not initialized")
        
        return await client.create_project(name, description)
    
    async def create_task(self, 
                         integration_type: IntegrationType, 
                         project_id: str, 
                         name: str, 
                         description: Optional[str] = None,
                         **kwargs) -> Dict[str, Any]:
        """
        Create a new task in the specified integration.
        
        Args:
            integration_type: Type of integration
            project_id: Project ID
            name: Task name
            description: Task description
            **kwargs: Additional task parameters
            
        Returns:
            Task data
            
        Raises:
            ValueError: If the client is not initialized or task creation fails
        """
        client = self.get_client(integration_type)
        if not client:
            raise ValueError(f"{integration_type} client not initialized")
        
        return await client.create_task(project_id, name, description, **kwargs)
    
    async def create_tasks(self, 
                          integration_type: IntegrationType, 
                          project_id: str, 
                          tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Create multiple tasks in the specified integration.
        
        Args:
            integration_type: Type of integration
            project_id: Project ID
            tasks: List of task data
            
        Returns:
            List of created task data
            
        Raises:
            ValueError: If the client is not initialized or task creation fails
        """
        client = self.get_client(integration_type)
        if not client:
            raise ValueError(f"{integration_type} client not initialized")
        
        return await client.create_tasks(project_id, tasks)
    
    async def get_projects(self, integration_type: IntegrationType) -> List[Dict[str, Any]]:
        """
        Get all projects for the specified integration.
        
        Args:
            integration_type: Type of integration
            
        Returns:
            List of project data
            
        Raises:
            ValueError: If the client is not initialized
        """
        client = self.get_client(integration_type)
        if not client:
            raise ValueError(f"{integration_type} client not initialized")
        
        return await client.get_projects()
    
    async def get_tasks(self, 
                       integration_type: IntegrationType, 
                       project_id: str) -> List[Dict[str, Any]]:
        """
        Get all tasks for a project in the specified integration.
        
        Args:
            integration_type: Type of integration
            project_id: Project ID
            
        Returns:
            List of task data
            
        Raises:
            ValueError: If the client is not initialized
        """
        client = self.get_client(integration_type)
        if not client:
            raise ValueError(f"{integration_type} client not initialized")
        
        return await client.get_tasks(project_id)
    
    async def update_task(self, 
                         integration_type: IntegrationType, 
                         project_id: str, 
                         task_id: str, 
                         **kwargs) -> Dict[str, Any]:
        """
        Update a task in the specified integration.
        
        Args:
            integration_type: Type of integration
            project_id: Project ID
            task_id: Task ID
            **kwargs: Task fields to update
            
        Returns:
            Updated task data
            
        Raises:
            ValueError: If the client is not initialized
        """
        client = self.get_client(integration_type)
        if not client:
            raise ValueError(f"{integration_type} client not initialized")
        
        return await client.update_task(project_id, task_id, **kwargs)
    
    async def get_task_url(self, 
                          integration_type: IntegrationType, 
                          project_id: str, 
                          task_id: str) -> str:
        """
        Get the URL for a task in the specified integration.
        
        Args:
            integration_type: Type of integration
            project_id: Project ID
            task_id: Task ID
            
        Returns:
            Task URL
            
        Raises:
            ValueError: If the client is not initialized
        """
        client = self.get_client(integration_type)
        if not client:
            raise ValueError(f"{integration_type} client not initialized")
        
        return await client.get_task_url(project_id, task_id)
    
    async def get_project_url(self, 
                             integration_type: IntegrationType, 
                             project_id: str) -> str:
        """
        Get the URL for a project in the specified integration.
        
        Args:
            integration_type: Type of integration
            project_id: Project ID
            
        Returns:
            Project URL
            
        Raises:
            ValueError: If the client is not initialized
        """
        client = self.get_client(integration_type)
        if not client:
            raise ValueError(f"{integration_type} client not initialized")
        
        return await client.get_project_url(project_id)
    
    def get_available_integrations(self) -> List[IntegrationType]:
        """
        Get a list of available integration types.
        
        Returns:
            List of integration types
        """
        return list(IntegrationType)
    
    def get_initialized_integrations(self) -> List[IntegrationType]:
        """
        Get a list of initialized integration types.
        
        Returns:
            List of initialized integration types
        """
        return list(self.clients.keys())
