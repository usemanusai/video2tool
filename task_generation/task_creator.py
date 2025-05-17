"""
Module for creating development tasks from software specifications.
"""

import logging
from typing import Dict, List, Any

from utils.openrouter_client import OpenRouterClient
from task_generation.dependency_analyzer import DependencyAnalyzer
from task_generation.prioritizer import Prioritizer
from task_generation.estimator import Estimator
import config

logger = logging.getLogger(__name__)

class TaskCreator:
    """
    Class for creating development tasks from software specifications.
    """
    
    def __init__(self):
        """Initialize the TaskCreator."""
        self.ai_client = OpenRouterClient()
        self.dependency_analyzer = DependencyAnalyzer()
        self.prioritizer = Prioritizer()
        self.estimator = Estimator()
    
    def create_tasks(self, specification: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create development tasks from a software specification.
        
        Args:
            specification: Software specification
            
        Returns:
            Dictionary containing task information
        """
        logger.info("Creating development tasks from specification")
        
        # Generate tasks with AI
        prompt = self._create_task_prompt(specification)
        task_text = self._process_with_ai(prompt)
        
        # Parse tasks
        tasks = self._parse_tasks(task_text)
        
        # Analyze dependencies
        tasks_with_dependencies = self.dependency_analyzer.analyze_dependencies(tasks)
        
        # Prioritize tasks
        prioritized_tasks = self.prioritizer.prioritize_tasks(tasks_with_dependencies)
        
        # Estimate task times
        estimated_tasks = self.estimator.estimate_tasks(prioritized_tasks)
        
        return {
            "tasks": estimated_tasks,
            "raw_text": task_text
        }
    
    def _create_task_prompt(self, specification: Dict[str, Any]) -> str:
        """
        Create a prompt for generating tasks.
        
        Args:
            specification: Software specification
            
        Returns:
            Formatted prompt for AI processing
        """
        # Extract relevant sections from the specification
        overview = specification.get("overview", {}).get("text", "")
        functional_reqs = specification.get("functional_requirements", [])
        user_stories = specification.get("user_stories", [])
        
        # Format functional requirements
        func_req_text = ""
        for i, req in enumerate(functional_reqs, 1):
            func_req_text += f"{i}. {req}\n"
        
        # Format user stories
        user_story_text = ""
        for i, story in enumerate(user_stories, 1):
            user_story_text += f"{i}. As a {story.get('user_type')}, I want to {story.get('action')}"
            if story.get('benefit'):
                user_story_text += f" so that {story.get('benefit')}"
            user_story_text += "\n"
            
            # Add acceptance criteria
            for j, criteria in enumerate(story.get('acceptance_criteria', []), 1):
                user_story_text += f"   {j}. {criteria}\n"
        
        # Create the prompt
        prompt = f"""
{config.TASK_GENERATION_PROMPT}

SOFTWARE OVERVIEW:
{overview}

FUNCTIONAL REQUIREMENTS:
{func_req_text}

USER STORIES:
{user_story_text}

Based on the above information, create a comprehensive development task list that includes:

1. A breakdown of actionable tasks organized by category (e.g., Backend, Frontend, Database, etc.)
2. Dependencies between tasks (which tasks must be completed before others)
3. Priority levels for each task (Critical, High, Medium, Low)
4. Time estimates for each task (in hours or days)
5. Suggested implementation approach for complex tasks
6. Potential challenges and mitigations

Format your response as a structured task list that could be imported into a project management tool.
For each task, include:
- Task ID (e.g., T1, T2, etc.)
- Task name
- Description
- Category
- Priority
- Dependencies (list of Task IDs)
- Time estimate
- Implementation notes
"""
        return prompt
    
    def _process_with_ai(self, prompt: str) -> str:
        """
        Process the prompt with AI to generate tasks.
        
        Args:
            prompt: Formatted prompt
            
        Returns:
            AI-generated task text
        """
        try:
            logger.info("Sending prompt to AI for task generation")
            response = self.ai_client.generate_completion(
                prompt=prompt,
                system_prompt=config.SYSTEM_PROMPT_TEMPLATE.format(
                    task_type="convert software specifications into actionable development tasks"
                ),
                max_tokens=3000
            )
            return response
        except Exception as e:
            logger.error(f"Error generating tasks with AI: {e}")
            return "Error generating tasks. Please try again."
    
    def _parse_tasks(self, task_text: str) -> List[Dict[str, Any]]:
        """
        Parse the AI-generated text into structured tasks.
        
        Args:
            task_text: AI-generated task text
            
        Returns:
            List of task dictionaries
        """
        tasks = []
        current_task = None
        current_category = None
        
        # Split text into lines
        lines = task_text.split("\n")
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this is a category header
            if line.startswith("#") or line.isupper() or (len(line) < 30 and ":" not in line):
                current_category = line.strip("#").strip()
                continue
            
            # Check if this is a task definition (usually starts with a task ID like "T1:")
            task_match = re.match(r"^(T\d+|Task\s+\d+)[\s:]+(.+)$", line, re.IGNORECASE)
            if task_match:
                # Save the previous task if there is one
                if current_task:
                    tasks.append(current_task)
                
                # Create a new task
                task_id = task_match.group(1).replace("Task", "T").replace(" ", "")
                task_name = task_match.group(2).strip()
                
                current_task = {
                    "id": task_id,
                    "name": task_name,
                    "description": "",
                    "category": current_category,
                    "priority": "Medium",  # Default priority
                    "dependencies": [],
                    "estimate": "",
                    "notes": ""
                }
                continue
            
            # If we have a current task, look for task attributes
            if current_task:
                # Description
                if line.startswith("Description:") or line.startswith("- Description:"):
                    current_task["description"] = line.split(":", 1)[1].strip()
                
                # Priority
                elif "priority" in line.lower():
                    priority_match = re.search(r"Priority:?\s*(Critical|High|Medium|Low)", line, re.IGNORECASE)
                    if priority_match:
                        current_task["priority"] = priority_match.group(1).capitalize()
                
                # Dependencies
                elif "dependencies" in line.lower() or "depends on" in line.lower():
                    deps_match = re.search(r"Dependencies:?\s*(.+)", line, re.IGNORECASE)
                    if deps_match:
                        deps_str = deps_match.group(1)
                        # Extract task IDs (T1, T2, etc.)
                        deps = re.findall(r"(T\d+)", deps_str)
                        current_task["dependencies"] = deps
                
                # Time estimate
                elif "estimate" in line.lower() or "time" in line.lower():
                    estimate_match = re.search(r"(Estimate|Time):?\s*(.+)", line, re.IGNORECASE)
                    if estimate_match:
                        current_task["estimate"] = estimate_match.group(2).strip()
                
                # Implementation notes
                elif "implementation" in line.lower() or "notes" in line.lower():
                    notes_match = re.search(r"(Implementation|Notes):?\s*(.+)", line, re.IGNORECASE)
                    if notes_match:
                        current_task["notes"] = notes_match.group(2).strip()
                
                # If none of the above, add to description
                elif not line.startswith("-") and ":" not in line:
                    if current_task["description"]:
                        current_task["description"] += " " + line
                    else:
                        current_task["description"] = line
        
        # Add the last task if there is one
        if current_task:
            tasks.append(current_task)
        
        return tasks
