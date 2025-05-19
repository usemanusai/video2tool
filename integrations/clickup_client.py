"""
ClickUp integration client.
"""

import logging
import os
from typing import Dict, List, Any, Optional
from urllib.parse import quote

import httpx

from integrations.base_client import BaseIntegrationClient
import config

logger = logging.getLogger(__name__)

class ClickUpClient(BaseIntegrationClient):
    """
    Client for integrating with ClickUp.
    
    Uses the ClickUp API to create and manage spaces, lists, and tasks.
    """
    
    def __init__(self, api_token: Optional[str] = None):
        """
        Initialize the ClickUp client.
        
        Args:
            api_token: ClickUp API token
        """
        super().__init__(api_token=api_token)
        
        # Use environment variables if not provided
        self.api_token = api_token or os.getenv("CLICKUP_API_TOKEN") or config.CLICKUP_API_TOKEN
        
        self.base_url = "https://api.clickup.com/api/v2"
        self.headers = {
            "Authorization": self.api_token,
            "Content-Type": "application/json"
        }
    
    async def authenticate(self) -> bool:
        """
        Authenticate with ClickUp.
        
        Returns:
            True if authentication was successful, False otherwise
        """
        if not self.api_token:
            logger.error("ClickUp API token not provided")
            return False
        
        try:
            # Test authentication by getting the user's teams
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/team",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    self.is_authenticated = True
                    logger.info("Successfully authenticated with ClickUp")
                    
                    # Store teams for later use
                    self.teams = response.json().get("teams", [])
                    
                    return True
                else:
                    logger.error(f"Failed to authenticate with ClickUp: {response.status_code} {response.text}")
                    return False
        
        except Exception as e:
            logger.error(f"Error authenticating with ClickUp: {e}")
            return False
    
    async def create_project(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new ClickUp space and list.
        
        Args:
            name: Space name
            description: Space description
            
        Returns:
            Space data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with ClickUp")
        
        try:
            # Get the first team
            if not hasattr(self, "teams") or not self.teams:
                raise ValueError("No teams found")
            
            team_id = self.teams[0]["id"]
            
            # Create the space
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/team/{team_id}/space",
                    headers=self.headers,
                    json={
                        "name": name,
                        "description": description or ""
                    }
                )
                
                if response.status_code not in [200, 201]:
                    raise ValueError(f"Failed to create ClickUp space: {response.status_code} {response.text}")
                
                space = response.json()
                
                # Create a default list
                list_response = await client.post(
                    f"{self.base_url}/space/{space['id']}/list",
                    headers=self.headers,
                    json={
                        "name": "Tasks",
                        "content": "Default list for tasks"
                    }
                )
                
                if list_response.status_code not in [200, 201]:
                    logger.warning(f"Failed to create default list: {list_response.status_code} {list_response.text}")
                    task_list = None
                else:
                    task_list = list_response.json()
                
                return {
                    "id": space["id"],
                    "name": space["name"],
                    "description": space.get("description", ""),
                    "team_id": team_id,
                    "default_list_id": task_list["id"] if task_list else None,
                    "url": f"https://app.clickup.com/{team_id}/v/s/{space['id']}"
                }
        
        except Exception as e:
            logger.error(f"Error creating ClickUp space: {e}")
            raise ValueError(f"Failed to create ClickUp space: {str(e)}")
    
    async def create_task(self, 
                         project_id: str, 
                         name: str, 
                         description: Optional[str] = None,
                         **kwargs) -> Dict[str, Any]:
        """
        Create a new ClickUp task.
        
        Args:
            project_id: List ID
            name: Task name
            description: Task description
            **kwargs: Additional task parameters
                - status: Task status
                - priority: Task priority (1-4, where 1 is urgent)
                - due_date: Due date (milliseconds since epoch)
                - tags: List of tag names
                - assignees: List of assignee IDs
            
        Returns:
            Task data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with ClickUp")
        
        try:
            # Prepare task data
            task_data = {
                "name": name,
                "description": description or ""
            }
            
            # Add optional parameters
            if "status" in kwargs:
                task_data["status"] = kwargs["status"]
            
            if "priority" in kwargs:
                task_data["priority"] = kwargs["priority"]
            
            if "due_date" in kwargs:
                task_data["due_date"] = kwargs["due_date"]
            
            if "tags" in kwargs and kwargs["tags"]:
                task_data["tags"] = kwargs["tags"]
            
            if "assignees" in kwargs and kwargs["assignees"]:
                task_data["assignees"] = kwargs["assignees"]
            
            # Create the task
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/list/{project_id}/task",
                    headers=self.headers,
                    json=task_data
                )
                
                if response.status_code not in [200, 201]:
                    raise ValueError(f"Failed to create ClickUp task: {response.status_code} {response.text}")
                
                task = response.json()
                
                return {
                    "id": task["id"],
                    "name": task["name"],
                    "description": task.get("description", ""),
                    "status": task.get("status", {}).get("status"),
                    "priority": task.get("priority", {}).get("priority") if task.get("priority") else None,
                    "url": task["url"],
                    "list_id": project_id
                }
        
        except Exception as e:
            logger.error(f"Error creating ClickUp task: {e}")
            raise ValueError(f"Failed to create ClickUp task: {str(e)}")
    
    async def create_tasks(self, 
                          project_id: str, 
                          tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Create multiple ClickUp tasks.
        
        Args:
            project_id: List ID
            tasks: List of task data
            
        Returns:
            List of created task data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with ClickUp")
        
        created_tasks = []
        
        try:
            for task in tasks:
                # Map priority
                priority = None
                if "priority" in task:
                    priority_map = {
                        "urgent": 1,
                        "high": 2,
                        "medium": 3,
                        "normal": 3,
                        "low": 4
                    }
                    priority = priority_map.get(task["priority"].lower(), 3)
                
                # Create the task
                created_task = await self.create_task(
                    project_id=project_id,
                    name=task["name"],
                    description=task.get("description", ""),
                    status=task.get("status"),
                    priority=priority,
                    due_date=task.get("due_date"),
                    tags=[task.get("category")] if task.get("category") else None
                )
                
                created_tasks.append(created_task)
            
            return created_tasks
        
        except Exception as e:
            logger.error(f"Error creating ClickUp tasks: {e}")
            raise ValueError(f"Failed to create ClickUp tasks: {str(e)}")
    
    async def get_projects(self) -> List[Dict[str, Any]]:
        """
        Get all ClickUp spaces for the authenticated user.
        
        Returns:
            List of space data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with ClickUp")
        
        try:
            spaces = []
            
            # Get spaces for each team
            for team in self.teams:
                team_id = team["id"]
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/team/{team_id}/space",
                        headers=self.headers
                    )
                    
                    if response.status_code != 200:
                        logger.error(f"Failed to get spaces for team {team_id}: {response.status_code} {response.text}")
                        continue
                    
                    team_spaces = response.json().get("spaces", [])
                    
                    for space in team_spaces:
                        # Get lists for the space
                        lists_response = await client.get(
                            f"{self.base_url}/space/{space['id']}/list",
                            headers=self.headers
                        )
                        
                        default_list_id = None
                        if lists_response.status_code == 200:
                            lists = lists_response.json().get("lists", [])
                            if lists:
                                default_list_id = lists[0]["id"]
                        
                        spaces.append({
                            "id": space["id"],
                            "name": space["name"],
                            "description": space.get("description", ""),
                            "team_id": team_id,
                            "default_list_id": default_list_id,
                            "url": f"https://app.clickup.com/{team_id}/v/s/{space['id']}"
                        })
            
            return spaces
        
        except Exception as e:
            logger.error(f"Error getting ClickUp spaces: {e}")
            raise ValueError(f"Failed to get ClickUp spaces: {str(e)}")
    
    async def get_tasks(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Get all tasks for a ClickUp list.
        
        Args:
            project_id: List ID
            
        Returns:
            List of task data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with ClickUp")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/list/{project_id}/task",
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Failed to get tasks: {response.status_code} {response.text}")
                
                tasks = response.json().get("tasks", [])
                
                return [
                    {
                        "id": task["id"],
                        "name": task["name"],
                        "description": task.get("description", ""),
                        "status": task.get("status", {}).get("status"),
                        "priority": task.get("priority", {}).get("priority") if task.get("priority") else None,
                        "url": task["url"],
                        "list_id": project_id
                    }
                    for task in tasks
                ]
        
        except Exception as e:
            logger.error(f"Error getting ClickUp tasks: {e}")
            raise ValueError(f"Failed to get ClickUp tasks: {str(e)}")
    
    async def update_task(self, 
                         project_id: str, 
                         task_id: str, 
                         **kwargs) -> Dict[str, Any]:
        """
        Update a ClickUp task.
        
        Args:
            project_id: List ID (not used, but required by interface)
            task_id: Task ID
            **kwargs: Task fields to update
                - name: Task name
                - description: Task description
                - status: Task status
                - priority: Task priority (1-4, where 1 is urgent)
                - due_date: Due date (milliseconds since epoch)
            
        Returns:
            Updated task data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with ClickUp")
        
        try:
            # Prepare update data
            update_data = {}
            
            if "name" in kwargs:
                update_data["name"] = kwargs["name"]
            
            if "description" in kwargs:
                update_data["description"] = kwargs["description"]
            
            if "status" in kwargs:
                update_data["status"] = kwargs["status"]
            
            if "priority" in kwargs:
                update_data["priority"] = kwargs["priority"]
            
            if "due_date" in kwargs:
                update_data["due_date"] = kwargs["due_date"]
            
            # Update the task
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    f"{self.base_url}/task/{task_id}",
                    headers=self.headers,
                    json=update_data
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Failed to update task: {response.status_code} {response.text}")
                
                task = response.json()
                
                return {
                    "id": task["id"],
                    "name": task["name"],
                    "description": task.get("description", ""),
                    "status": task.get("status", {}).get("status"),
                    "priority": task.get("priority", {}).get("priority") if task.get("priority") else None,
                    "url": task["url"]
                }
        
        except Exception as e:
            logger.error(f"Error updating ClickUp task: {e}")
            raise ValueError(f"Failed to update ClickUp task: {str(e)}")
    
    async def get_task_url(self, project_id: str, task_id: str) -> str:
        """
        Get the URL for a ClickUp task.
        
        Args:
            project_id: List ID (not used, but required by interface)
            task_id: Task ID
            
        Returns:
            Task URL
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with ClickUp")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/task/{task_id}",
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Failed to get task: {response.status_code} {response.text}")
                
                task = response.json()
                
                return task["url"]
        
        except Exception as e:
            logger.error(f"Error getting ClickUp task URL: {e}")
            raise ValueError(f"Failed to get ClickUp task URL: {str(e)}")
    
    async def get_project_url(self, project_id: str) -> str:
        """
        Get the URL for a ClickUp list.
        
        Args:
            project_id: List ID
            
        Returns:
            List URL
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with ClickUp")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/list/{project_id}",
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Failed to get list: {response.status_code} {response.text}")
                
                list_data = response.json()
                
                # Get the space ID
                space_id = list_data.get("space", {}).get("id")
                
                # Get the team ID
                for team in self.teams:
                    team_id = team["id"]
                    
                    # Check if the space belongs to this team
                    space_response = await client.get(
                        f"{self.base_url}/team/{team_id}/space",
                        headers=self.headers
                    )
                    
                    if space_response.status_code != 200:
                        continue
                    
                    spaces = space_response.json().get("spaces", [])
                    
                    for space in spaces:
                        if space["id"] == space_id:
                            return f"https://app.clickup.com/{team_id}/v/li/{project_id}"
                
                # If we couldn't find the team, return a generic URL
                return f"https://app.clickup.com/t/li/{project_id}"
        
        except Exception as e:
            logger.error(f"Error getting ClickUp list URL: {e}")
            raise ValueError(f"Failed to get ClickUp list URL: {str(e)}")
