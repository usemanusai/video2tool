"""
Module for estimating task completion times.
"""

import logging
import re
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class Estimator:
    """
    Class for estimating task completion times.
    """
    
    def __init__(self):
        """Initialize the Estimator."""
        # Complexity factors (multipliers for base estimates)
        self.complexity_factors = {
            "Low": 0.8,
            "Medium": 1.0,
            "High": 1.5,
            "Very High": 2.0
        }
        
        # Base estimates by category (in hours)
        self.base_estimates = {
            "Backend": 8,
            "Frontend": 6,
            "Database": 4,
            "Infrastructure": 6,
            "Authentication": 8,
            "Testing": 4,
            "Documentation": 2
        }
        
        # Default base estimate
        self.default_base_estimate = 6  # hours
    
    def estimate_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Estimate completion times for tasks.
        
        Args:
            tasks: List of task dictionaries
            
        Returns:
            Tasks with estimated completion times
        """
        logger.info(f"Estimating completion times for {len(tasks)} tasks")
        
        for task in tasks:
            # Check if the task already has an estimate
            existing_estimate = task.get("estimate", "")
            if existing_estimate and self._is_valid_estimate(existing_estimate):
                # Parse the existing estimate
                hours = self._parse_estimate(existing_estimate)
                if hours > 0:
                    task["estimated_hours"] = hours
                    continue
            
            # Calculate a new estimate
            category = task.get("category", "").strip()
            base_estimate = self.base_estimates.get(category, self.default_base_estimate)
            
            # Determine complexity based on description and dependencies
            complexity = self._determine_complexity(task)
            complexity_factor = self.complexity_factors.get(complexity, 1.0)
            
            # Calculate estimated hours
            estimated_hours = base_estimate * complexity_factor
            
            # Adjust based on dependencies
            dependency_count = len(task.get("dependencies", []))
            if dependency_count > 2:
                # More dependencies can increase complexity
                estimated_hours *= (1.0 + (dependency_count - 2) * 0.1)  # 10% increase per dependency beyond 2
            
            # Round to nearest hour
            estimated_hours = round(estimated_hours)
            
            # Add to task
            task["estimated_hours"] = estimated_hours
            task["complexity"] = complexity
            
            # Format the estimate as a string (e.g., "8 hours")
            if "estimate" not in task or not task["estimate"]:
                task["estimate"] = f"{estimated_hours} hours"
        
        # Calculate total estimated time
        total_hours = sum(task.get("estimated_hours", 0) for task in tasks)
        logger.info(f"Total estimated time: {total_hours} hours")
        
        return tasks
    
    def _determine_complexity(self, task: Dict[str, Any]) -> str:
        """
        Determine the complexity of a task based on its description and other factors.
        
        Args:
            task: Task dictionary
            
        Returns:
            Complexity level ("Low", "Medium", "High", "Very High")
        """
        description = task.get("description", "").lower()
        name = task.get("name", "").lower()
        notes = task.get("notes", "").lower()
        
        # Combine text for analysis
        text = f"{name} {description} {notes}"
        
        # Check for complexity indicators
        complexity_indicators = {
            "Very High": ["complex", "challenging", "difficult", "advanced", "sophisticated"],
            "High": ["integrate", "optimize", "secure", "scale", "refactor"],
            "Low": ["simple", "basic", "straightforward", "easy"]
        }
        
        # Check for matches
        for complexity, indicators in complexity_indicators.items():
            if any(indicator in text for indicator in indicators):
                return complexity
        
        # Default to Medium complexity
        return "Medium"
    
    def _is_valid_estimate(self, estimate: str) -> bool:
        """
        Check if an estimate string is valid.
        
        Args:
            estimate: Estimate string
            
        Returns:
            True if valid, False otherwise
        """
        # Check for patterns like "8 hours", "2 days", "1.5 hours", etc.
        return bool(re.search(r"\d+(\.\d+)?\s*(hour|hours|day|days|week|weeks)", estimate, re.IGNORECASE))
    
    def _parse_estimate(self, estimate: str) -> float:
        """
        Parse an estimate string into hours.
        
        Args:
            estimate: Estimate string
            
        Returns:
            Estimated hours
        """
        # Extract number and unit
        match = re.search(r"(\d+(\.\d+)?)\s*(hour|hours|day|days|week|weeks)", estimate, re.IGNORECASE)
        if not match:
            return 0
        
        value = float(match.group(1))
        unit = match.group(3).lower()
        
        # Convert to hours
        if unit in ["hour", "hours"]:
            return value
        elif unit in ["day", "days"]:
            return value * 8  # 8 hours per day
        elif unit in ["week", "weeks"]:
            return value * 40  # 40 hours per week
        
        return 0
