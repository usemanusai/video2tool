"""
Trello integration client.
"""

import logging
import os
from typing import Dict, List, Any, Optional
from urllib.parse import quote

import httpx

from integrations.base_client import BaseIntegrationClient
import config

logger = logging.getLogger(__name__)

class TrelloClient(BaseIntegrationClient):
    """
    Client for integrating with Trello.

    Uses the Trello REST API to create and manage boards, lists, and cards.
    """

    def __init__(self, api_key: Optional[str] = None, api_token: Optional[str] = None):
        """
        Initialize the Trello client.

        Args:
            api_key: Trello API key
            api_token: Trello API token
        """
        super().__init__(api_key, api_token)

        # Use environment variables if not provided
        self.api_key = api_key or os.getenv("TRELLO_API_KEY") or config.TRELLO_API_KEY
        self.api_token = api_token or os.getenv("TRELLO_API_TOKEN") or config.TRELLO_API_TOKEN

        self.base_url = "https://api.trello.com/1"
        self.auth_params = {
            "key": self.api_key,
            "token": self.api_token
        }

    async def authenticate(self) -> bool:
        """
        Authenticate with Trello.

        Returns:
            True if authentication was successful, False otherwise
        """
        if not self.api_key or not self.api_token:
            logger.error("Trello API key or token not provided")
            return False

        try:
            # Test authentication by getting the user's boards
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/members/me/boards",
                    params=self.auth_params
                )

                if response.status_code == 200:
                    self.is_authenticated = True
                    logger.info("Successfully authenticated with Trello")
                    return True
                else:
                    logger.error(f"Failed to authenticate with Trello: {response.status_code} {response.text}")
                    return False

        except Exception as e:
            logger.error(f"Error authenticating with Trello: {e}")
            return False

    async def create_project(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new Trello board.

        Args:
            name: Board name
            description: Board description

        Returns:
            Board data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with Trello")

        try:
            # Create the board
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/boards",
                    params={
                        **self.auth_params,
                        "name": name,
                        "desc": description or "",
                        "defaultLists": "false"  # Don't create default lists
                    }
                )

                if response.status_code != 200:
                    raise ValueError(f"Failed to create Trello board: {response.status_code} {response.text}")

                board = response.json()

                # Create default lists
                lists = await self._create_default_lists(board["id"])

                return {
                    "id": board["id"],
                    "name": board["name"],
                    "description": board.get("desc", ""),
                    "url": board["url"],
                    "lists": lists
                }

        except Exception as e:
            logger.error(f"Error creating Trello board: {e}")
            raise ValueError(f"Failed to create Trello board: {str(e)}")

    async def _create_default_lists(self, board_id: str) -> List[Dict[str, Any]]:
        """
        Create default lists for a board.

        Args:
            board_id: Board ID

        Returns:
            List of created lists
        """
        list_names = ["Backlog", "To Do", "In Progress", "Done"]
        lists = []

        try:
            async with httpx.AsyncClient() as client:
                for name in list_names:
                    response = await client.post(
                        f"{self.base_url}/lists",
                        params={
                            **self.auth_params,
                            "name": name,
                            "idBoard": board_id,
                            "pos": "bottom"
                        }
                    )

                    if response.status_code == 200:
                        lists.append(response.json())
                    else:
                        logger.error(f"Failed to create list '{name}': {response.status_code} {response.text}")

            return lists

        except Exception as e:
            logger.error(f"Error creating default lists: {e}")
            return []

    async def create_task(self,
                         project_id: str,
                         name: str,
                         description: Optional[str] = None,
                         **kwargs) -> Dict[str, Any]:
        """
        Create a new Trello card.

        Args:
            project_id: Board ID
            name: Card name
            description: Card description
            **kwargs: Additional card parameters
                - list_id: List ID (default: first list on the board)
                - position: Card position (default: "bottom")
                - labels: List of label names
                - due_date: Due date (ISO format)
                - members: List of member IDs

        Returns:
            Card data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with Trello")

        try:
            # Get the list ID if not provided
            list_id = kwargs.get("list_id")
            if not list_id:
                # Get the first list on the board (usually "Backlog" or "To Do")
                lists = await self._get_lists(project_id)
                if not lists:
                    raise ValueError(f"No lists found for board {project_id}")

                list_id = lists[0]["id"]

            # Create the card
            card_params = {
                **self.auth_params,
                "name": name,
                "desc": description or "",
                "idList": list_id,
                "pos": kwargs.get("position", "bottom")
            }

            # Add optional parameters
            if "due_date" in kwargs:
                card_params["due"] = kwargs["due_date"]

            if "members" in kwargs:
                card_params["idMembers"] = ",".join(kwargs["members"])

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/cards",
                    params=card_params
                )

                if response.status_code != 200:
                    raise ValueError(f"Failed to create Trello card: {response.status_code} {response.text}")

                card = response.json()

                # Add labels if provided
                if "labels" in kwargs and kwargs["labels"]:
                    await self._add_labels_to_card(card["id"], kwargs["labels"])

                return {
                    "id": card["id"],
                    "name": card["name"],
                    "description": card.get("desc", ""),
                    "url": card["url"],
                    "list_id": card["idList"],
                    "board_id": card["idBoard"]
                }

        except Exception as e:
            logger.error(f"Error creating Trello card: {e}")
            raise ValueError(f"Failed to create Trello card: {str(e)}")

    async def _get_lists(self, board_id: str) -> List[Dict[str, Any]]:
        """
        Get all lists for a board.

        Args:
            board_id: Board ID

        Returns:
            List of list data
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/boards/{board_id}/lists",
                    params=self.auth_params
                )

                if response.status_code != 200:
                    raise ValueError(f"Failed to get lists: {response.status_code} {response.text}")

                return response.json()

        except Exception as e:
            logger.error(f"Error getting lists: {e}")
            return []

    async def _add_labels_to_card(self, card_id: str, labels: List[str]) -> None:
        """
        Add labels to a card.

        Args:
            card_id: Card ID
            labels: List of label names
        """
        try:
            async with httpx.AsyncClient() as client:
                for label in labels:
                    # Create or get the label
                    response = await client.post(
                        f"{self.base_url}/cards/{card_id}/labels",
                        params={
                            **self.auth_params,
                            "color": self._get_label_color(label),
                            "name": label
                        }
                    )

                    if response.status_code != 200:
                        logger.error(f"Failed to add label '{label}': {response.status_code} {response.text}")

        except Exception as e:
            logger.error(f"Error adding labels: {e}")

    def _get_label_color(self, label: str) -> str:
        """
        Get a color for a label based on its name.

        Args:
            label: Label name

        Returns:
            Label color
        """
        # Map common label names to colors
        label_lower = label.lower()

        if "bug" in label_lower or "error" in label_lower:
            return "red"
        elif "feature" in label_lower:
            return "green"
        elif "enhancement" in label_lower or "improvement" in label_lower:
            return "blue"
        elif "documentation" in label_lower or "docs" in label_lower:
            return "purple"
        elif "ui" in label_lower or "ux" in label_lower:
            return "orange"
        elif "backend" in label_lower or "api" in label_lower:
            return "yellow"
        elif "frontend" in label_lower:
            return "sky"
        elif "database" in label_lower or "data" in label_lower:
            return "lime"
        elif "test" in label_lower or "testing" in label_lower:
            return "pink"
        else:
            return "black"

    async def create_tasks(self,
                          project_id: str,
                          tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Create multiple Trello cards.

        Args:
            project_id: Board ID
            tasks: List of task data

        Returns:
            List of created card data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with Trello")

        created_tasks = []

        try:
            # Get lists for the board
            lists = await self._get_lists(project_id)
            if not lists:
                raise ValueError(f"No lists found for board {project_id}")

            # Create a mapping of list names to IDs
            list_map = {list_data["name"].lower(): list_data["id"] for list_data in lists}

            # Default to the first list (usually "Backlog")
            default_list_id = lists[0]["id"]

            # Create each task
            for task in tasks:
                # Determine the list based on task status or category
                list_id = default_list_id

                # Check if a specific list is requested
                if "list" in task:
                    list_name = task["list"].lower()
                    list_id = list_map.get(list_name, default_list_id)
                elif "status" in task:
                    status = task["status"].lower()
                    if status in ["to do", "todo", "backlog"]:
                        list_id = list_map.get("to do", list_map.get("backlog", default_list_id))
                    elif status in ["in progress", "doing"]:
                        list_id = list_map.get("in progress", default_list_id)
                    elif status in ["done", "completed"]:
                        list_id = list_map.get("done", default_list_id)

                # Prepare labels
                labels = []
                if "category" in task:
                    labels.append(task["category"])
                if "priority" in task:
                    labels.append(task["priority"])

                # Create the task
                created_task = await self.create_task(
                    project_id=project_id,
                    name=task["name"],
                    description=task.get("description", ""),
                    list_id=list_id,
                    labels=labels,
                    due_date=task.get("due_date")
                )

                created_tasks.append(created_task)

            return created_tasks

        except Exception as e:
            logger.error(f"Error creating Trello cards: {e}")
            raise ValueError(f"Failed to create Trello cards: {str(e)}")

    async def get_projects(self) -> List[Dict[str, Any]]:
        """
        Get all Trello boards.

        Returns:
            List of board data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with Trello")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/members/me/boards",
                    params=self.auth_params
                )

                if response.status_code != 200:
                    raise ValueError(f"Failed to get boards: {response.status_code} {response.text}")

                boards = response.json()

                return [
                    {
                        "id": board["id"],
                        "name": board["name"],
                        "description": board.get("desc", ""),
                        "url": board["url"]
                    }
                    for board in boards
                ]

        except Exception as e:
            logger.error(f"Error getting Trello boards: {e}")
            raise ValueError(f"Failed to get Trello boards: {str(e)}")

    async def get_tasks(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Get all cards for a Trello board.

        Args:
            project_id: Board ID

        Returns:
            List of card data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with Trello")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/boards/{project_id}/cards",
                    params=self.auth_params
                )

                if response.status_code != 200:
                    raise ValueError(f"Failed to get cards: {response.status_code} {response.text}")

                cards = response.json()

                return [
                    {
                        "id": card["id"],
                        "name": card["name"],
                        "description": card.get("desc", ""),
                        "url": card["url"],
                        "list_id": card["idList"],
                        "board_id": card["idBoard"]
                    }
                    for card in cards
                ]

        except Exception as e:
            logger.error(f"Error getting Trello cards: {e}")
            raise ValueError(f"Failed to get Trello cards: {str(e)}")

    async def update_task(self,
                         project_id: str,
                         task_id: str,
                         **kwargs) -> Dict[str, Any]:
        """
        Update a Trello card.

        Args:
            project_id: Board ID (not used, but required by interface)
            task_id: Card ID
            **kwargs: Card fields to update
                - name: Card name
                - description: Card description
                - list_id: List ID
                - position: Card position
                - due_date: Due date (ISO format)
                - closed: Whether the card is archived

        Returns:
            Updated card data
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with Trello")

        try:
            # Prepare update parameters
            update_params = {**self.auth_params}

            if "name" in kwargs:
                update_params["name"] = kwargs["name"]

            if "description" in kwargs:
                update_params["desc"] = kwargs["description"]

            if "list_id" in kwargs:
                update_params["idList"] = kwargs["list_id"]

            if "position" in kwargs:
                update_params["pos"] = kwargs["position"]

            if "due_date" in kwargs:
                update_params["due"] = kwargs["due_date"]

            if "closed" in kwargs:
                update_params["closed"] = str(kwargs["closed"]).lower()

            # Update the card
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    f"{self.base_url}/cards/{task_id}",
                    params=update_params
                )

                if response.status_code != 200:
                    raise ValueError(f"Failed to update card: {response.status_code} {response.text}")

                card = response.json()

                return {
                    "id": card["id"],
                    "name": card["name"],
                    "description": card.get("desc", ""),
                    "url": card["url"],
                    "list_id": card["idList"],
                    "board_id": card["idBoard"]
                }

        except Exception as e:
            logger.error(f"Error updating Trello card: {e}")
            raise ValueError(f"Failed to update Trello card: {str(e)}")

    async def get_task_url(self, project_id: str, task_id: str) -> str:
        """
        Get the URL for a Trello card.

        Args:
            project_id: Board ID (not used, but required by interface)
            task_id: Card ID

        Returns:
            Card URL
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with Trello")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/cards/{task_id}",
                    params={
                        **self.auth_params,
                        "fields": "url"
                    }
                )

                if response.status_code != 200:
                    raise ValueError(f"Failed to get card URL: {response.status_code} {response.text}")

                card = response.json()

                return card["url"]

        except Exception as e:
            logger.error(f"Error getting Trello card URL: {e}")
            raise ValueError(f"Failed to get Trello card URL: {str(e)}")

    async def get_project_url(self, project_id: str) -> str:
        """
        Get the URL for a Trello board.

        Args:
            project_id: Board ID

        Returns:
            Board URL
        """
        if not self.is_authenticated and not await self.authenticate():
            raise ValueError("Not authenticated with Trello")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/boards/{project_id}",
                    params={
                        **self.auth_params,
                        "fields": "url"
                    }
                )

                if response.status_code != 200:
                    raise ValueError(f"Failed to get board URL: {response.status_code} {response.text}")

                board = response.json()

                return board["url"]

        except Exception as e:
            logger.error(f"Error getting Trello board URL: {e}")
            raise ValueError(f"Failed to get Trello board URL: {str(e)}")
