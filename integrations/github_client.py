"""
GitHub Issues integration client.
"""

import logging
import os
import re
from typing import Dict, List, Any, Optional
from urllib.parse import quote

import httpx

from integrations.base_client import BaseIntegrationClient
import config

logger = logging.getLogger(__name__)

class GitHubClient(BaseIntegrationClient):
    """
    Client for integrating with GitHub Issues.
    
    Uses the GitHub REST API to create and manage repositories and issues.
    """
    
    def __init__(self, api_token: Optional[str] = None):
        """
        Initialize the GitHub client.
        
        Args:
            api_token: GitHub personal access token
        """
        super().__init__(api_token=api_token)
        
        # Use environment variables if not provided
        self.api_token = api_token or os.getenv("GITHUB_API_TOKEN") or config.GITHUB_API_TOKEN
        
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"token {self.api_token}"
        }
    
    async def authenticate(self) -> bool:
        """
        Authenticate with GitHub.
        
        Returns:
            True if authentication was successful, False otherwise
        """
        if not self.api_token:
            logger.error("GitHub API token not provided")
            return False
        
        try:
            # Test authentication by getting the user's profile
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/user",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    self.is_authenticated = True
                    logger.info("Successfully authenticated with GitHub")
                    return True
                else:
                    logger.error(f"Failed to authenticate with GitHub: {response.status_code} {response.text}")
                    return False
        
        except Exception as e:
            logger.error(f"Error authenticating with GitHub: {e}")
            return False
    
    async def create_project(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new GitHub repository.
        
        Args:
            name: Repository name
            description: Repository description
            
        Returns:
            Repository data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with GitHub")
        
        try:
            # Create the repository
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/user/repos",
                    headers=self.headers,
                    json={
                        "name": name,
                        "description": description or "",
                        "private": False,
                        "has_issues": True,
                        "auto_init": True
                    }
                )
                
                if response.status_code not in [200, 201]:
                    raise ValueError(f"Failed to create GitHub repository: {response.status_code} {response.text}")
                
                repo = response.json()
                
                # Create default labels
                await self._create_default_labels(repo["owner"]["login"], repo["name"])
                
                return {
                    "id": str(repo["id"]),
                    "name": repo["name"],
                    "full_name": repo["full_name"],
                    "description": repo.get("description", ""),
                    "url": repo["html_url"],
                    "api_url": repo["url"],
                    "issues_url": repo["issues_url"].replace("{/number}", "")
                }
        
        except Exception as e:
            logger.error(f"Error creating GitHub repository: {e}")
            raise ValueError(f"Failed to create GitHub repository: {str(e)}")
    
    async def _create_default_labels(self, owner: str, repo: str) -> None:
        """
        Create default labels for a repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
        """
        default_labels = [
            {"name": "bug", "color": "d73a4a", "description": "Something isn't working"},
            {"name": "enhancement", "color": "a2eeef", "description": "New feature or request"},
            {"name": "documentation", "color": "0075ca", "description": "Improvements or additions to documentation"},
            {"name": "ui", "color": "fbca04", "description": "User interface related"},
            {"name": "backend", "color": "1d76db", "description": "Backend related"},
            {"name": "frontend", "color": "0e8a16", "description": "Frontend related"},
            {"name": "database", "color": "5319e7", "description": "Database related"},
            {"name": "testing", "color": "c5def5", "description": "Testing related"},
            {"name": "high-priority", "color": "b60205", "description": "High priority task"},
            {"name": "medium-priority", "color": "fbca04", "description": "Medium priority task"},
            {"name": "low-priority", "color": "0e8a16", "description": "Low priority task"}
        ]
        
        try:
            async with httpx.AsyncClient() as client:
                for label in default_labels:
                    await client.post(
                        f"{self.base_url}/repos/{owner}/{repo}/labels",
                        headers=self.headers,
                        json=label
                    )
        
        except Exception as e:
            logger.error(f"Error creating default labels: {e}")
    
    async def create_task(self, 
                         project_id: str, 
                         name: str, 
                         description: Optional[str] = None,
                         **kwargs) -> Dict[str, Any]:
        """
        Create a new GitHub issue.
        
        Args:
            project_id: Repository full name (owner/repo)
            name: Issue title
            description: Issue body
            **kwargs: Additional issue parameters
                - labels: List of label names
                - assignees: List of assignee usernames
                - milestone: Milestone number
            
        Returns:
            Issue data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with GitHub")
        
        try:
            # Parse project_id to get owner and repo
            owner, repo = self._parse_project_id(project_id)
            
            # Prepare issue data
            issue_data = {
                "title": name,
                "body": description or ""
            }
            
            # Add optional parameters
            if "labels" in kwargs and kwargs["labels"]:
                issue_data["labels"] = kwargs["labels"]
            
            if "assignees" in kwargs and kwargs["assignees"]:
                issue_data["assignees"] = kwargs["assignees"]
            
            if "milestone" in kwargs and kwargs["milestone"]:
                issue_data["milestone"] = kwargs["milestone"]
            
            # Create the issue
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/repos/{owner}/{repo}/issues",
                    headers=self.headers,
                    json=issue_data
                )
                
                if response.status_code not in [200, 201]:
                    raise ValueError(f"Failed to create GitHub issue: {response.status_code} {response.text}")
                
                issue = response.json()
                
                return {
                    "id": str(issue["id"]),
                    "number": issue["number"],
                    "title": issue["title"],
                    "body": issue.get("body", ""),
                    "url": issue["html_url"],
                    "api_url": issue["url"],
                    "labels": [label["name"] for label in issue.get("labels", [])],
                    "assignees": [assignee["login"] for assignee in issue.get("assignees", [])]
                }
        
        except Exception as e:
            logger.error(f"Error creating GitHub issue: {e}")
            raise ValueError(f"Failed to create GitHub issue: {str(e)}")
    
    def _parse_project_id(self, project_id: str) -> tuple:
        """
        Parse a project ID into owner and repo.
        
        Args:
            project_id: Repository full name (owner/repo) or ID
            
        Returns:
            Tuple of (owner, repo)
        """
        # Check if project_id is in the format "owner/repo"
        if "/" in project_id:
            return project_id.split("/", 1)
        
        # If it's a numeric ID, we need to look up the repository
        raise ValueError("Project ID must be in the format 'owner/repo'")
    
    async def create_tasks(self, 
                          project_id: str, 
                          tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Create multiple GitHub issues.
        
        Args:
            project_id: Repository full name (owner/repo)
            tasks: List of task data
            
        Returns:
            List of created issue data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with GitHub")
        
        created_tasks = []
        
        try:
            for task in tasks:
                # Prepare labels
                labels = []
                if "category" in task:
                    labels.append(task["category"].lower().replace(" ", "-"))
                if "priority" in task:
                    labels.append(f"{task['priority'].lower()}-priority")
                
                # Create the task
                created_task = await self.create_task(
                    project_id=project_id,
                    name=task["name"],
                    description=task.get("description", ""),
                    labels=labels,
                    assignees=task.get("assignees", [])
                )
                
                created_tasks.append(created_task)
            
            return created_tasks
        
        except Exception as e:
            logger.error(f"Error creating GitHub issues: {e}")
            raise ValueError(f"Failed to create GitHub issues: {str(e)}")
    
    async def get_projects(self) -> List[Dict[str, Any]]:
        """
        Get all GitHub repositories for the authenticated user.
        
        Returns:
            List of repository data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with GitHub")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/user/repos",
                    headers=self.headers,
                    params={"per_page": 100}
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Failed to get repositories: {response.status_code} {response.text}")
                
                repos = response.json()
                
                return [
                    {
                        "id": str(repo["id"]),
                        "name": repo["name"],
                        "full_name": repo["full_name"],
                        "description": repo.get("description", ""),
                        "url": repo["html_url"],
                        "api_url": repo["url"],
                        "issues_url": repo["issues_url"].replace("{/number}", "")
                    }
                    for repo in repos
                ]
        
        except Exception as e:
            logger.error(f"Error getting GitHub repositories: {e}")
            raise ValueError(f"Failed to get GitHub repositories: {str(e)}")
    
    async def get_tasks(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Get all issues for a GitHub repository.
        
        Args:
            project_id: Repository full name (owner/repo)
            
        Returns:
            List of issue data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with GitHub")
        
        try:
            # Parse project_id to get owner and repo
            owner, repo = self._parse_project_id(project_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}/issues",
                    headers=self.headers,
                    params={"state": "all", "per_page": 100}
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Failed to get issues: {response.status_code} {response.text}")
                
                issues = response.json()
                
                return [
                    {
                        "id": str(issue["id"]),
                        "number": issue["number"],
                        "title": issue["title"],
                        "body": issue.get("body", ""),
                        "url": issue["html_url"],
                        "api_url": issue["url"],
                        "state": issue["state"],
                        "labels": [label["name"] for label in issue.get("labels", [])],
                        "assignees": [assignee["login"] for assignee in issue.get("assignees", [])]
                    }
                    for issue in issues if "pull_request" not in issue  # Filter out pull requests
                ]
        
        except Exception as e:
            logger.error(f"Error getting GitHub issues: {e}")
            raise ValueError(f"Failed to get GitHub issues: {str(e)}")
    
    async def update_task(self, 
                         project_id: str, 
                         task_id: str, 
                         **kwargs) -> Dict[str, Any]:
        """
        Update a GitHub issue.
        
        Args:
            project_id: Repository full name (owner/repo)
            task_id: Issue number
            **kwargs: Issue fields to update
                - title: Issue title
                - body: Issue body
                - state: Issue state ("open" or "closed")
                - labels: List of label names
                - assignees: List of assignee usernames
            
        Returns:
            Updated issue data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with GitHub")
        
        try:
            # Parse project_id to get owner and repo
            owner, repo = self._parse_project_id(project_id)
            
            # Prepare update data
            update_data = {}
            
            if "title" in kwargs:
                update_data["title"] = kwargs["title"]
            
            if "body" in kwargs:
                update_data["body"] = kwargs["body"]
            
            if "state" in kwargs:
                update_data["state"] = kwargs["state"]
            
            if "labels" in kwargs:
                update_data["labels"] = kwargs["labels"]
            
            if "assignees" in kwargs:
                update_data["assignees"] = kwargs["assignees"]
            
            # Update the issue
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/repos/{owner}/{repo}/issues/{task_id}",
                    headers=self.headers,
                    json=update_data
                )
                
                if response.status_code != 200:
                    raise ValueError(f"Failed to update issue: {response.status_code} {response.text}")
                
                issue = response.json()
                
                return {
                    "id": str(issue["id"]),
                    "number": issue["number"],
                    "title": issue["title"],
                    "body": issue.get("body", ""),
                    "url": issue["html_url"],
                    "api_url": issue["url"],
                    "state": issue["state"],
                    "labels": [label["name"] for label in issue.get("labels", [])],
                    "assignees": [assignee["login"] for assignee in issue.get("assignees", [])]
                }
        
        except Exception as e:
            logger.error(f"Error updating GitHub issue: {e}")
            raise ValueError(f"Failed to update GitHub issue: {str(e)}")
    
    async def get_task_url(self, project_id: str, task_id: str) -> str:
        """
        Get the URL for a GitHub issue.
        
        Args:
            project_id: Repository full name (owner/repo)
            task_id: Issue number
            
        Returns:
            Issue URL
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with GitHub")
        
        try:
            # Parse project_id to get owner and repo
            owner, repo = self._parse_project_id(project_id)
            
            return f"https://github.com/{owner}/{repo}/issues/{task_id}"
        
        except Exception as e:
            logger.error(f"Error getting GitHub issue URL: {e}")
            raise ValueError(f"Failed to get GitHub issue URL: {str(e)}")
    
    async def get_project_url(self, project_id: str) -> str:
        """
        Get the URL for a GitHub repository.
        
        Args:
            project_id: Repository full name (owner/repo)
            
        Returns:
            Repository URL
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with GitHub")
        
        try:
            # Parse project_id to get owner and repo
            owner, repo = self._parse_project_id(project_id)
            
            return f"https://github.com/{owner}/{repo}"
        
        except Exception as e:
            logger.error(f"Error getting GitHub repository URL: {e}")
            raise ValueError(f"Failed to get GitHub repository URL: {str(e)}")
