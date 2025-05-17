"""
Module for prioritizing development tasks.
"""

import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class Prioritizer:
    """
    Class for prioritizing development tasks based on various factors.
    """
    
    def __init__(self):
        """Initialize the Prioritizer."""
        # Priority weights (higher values mean higher priority)
        self.priority_weights = {
            "Critical": 4,
            "High": 3,
            "Medium": 2,
            "Low": 1
        }
        
        # Category weights (can be adjusted based on project needs)
        self.category_weights = {
            "Backend": 1.2,
            "Frontend": 1.1,
            "Database": 1.3,
            "Infrastructure": 1.4,
            "Authentication": 1.5,
            "Testing": 0.9,
            "Documentation": 0.8
        }
        
        # Default category weight
        self.default_category_weight = 1.0
    
    def prioritize_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Prioritize tasks based on dependencies, explicit priority, and other factors.
        
        Args:
            tasks: List of task dictionaries with dependency information
            
        Returns:
            Prioritized list of tasks
        """
        logger.info(f"Prioritizing {len(tasks)} tasks")
        
        # Calculate priority score for each task
        for task in tasks:
            # Base score from explicit priority
            priority_value = self.priority_weights.get(task.get("priority", "Medium"), 2)
            
            # Adjust based on category
            category = task.get("category", "").strip()
            category_weight = self.category_weights.get(category, self.default_category_weight)
            
            # Adjust based on dependency depth
            # Tasks with higher depth (more dependencies) get lower priority
            depth = task.get("depth", 0)
            depth_factor = 1.0 / (depth + 1)  # Avoid division by zero
            
            # Adjust based on dependent tasks
            # Tasks with more dependents get higher priority
            dependent_count = task.get("dependent_count", 0)
            dependent_factor = 1.0 + (dependent_count * 0.1)  # 10% boost per dependent
            
            # Calculate final score
            priority_score = priority_value * category_weight * depth_factor * dependent_factor
            
            # Add score to task
            task["priority_score"] = priority_score
        
        # Sort tasks by priority score (descending)
        prioritized_tasks = sorted(tasks, key=lambda x: x.get("priority_score", 0), reverse=True)
        
        # Add rank to tasks
        for i, task in enumerate(prioritized_tasks, 1):
            task["rank"] = i
        
        return prioritized_tasks
