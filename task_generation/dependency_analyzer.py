"""
Module for analyzing dependencies between tasks.
"""

import logging
import networkx as nx
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class DependencyAnalyzer:
    """
    Class for analyzing dependencies between tasks.
    
    Uses a directed graph to represent task dependencies and detect cycles.
    """
    
    def __init__(self):
        """Initialize the DependencyAnalyzer."""
        pass
    
    def analyze_dependencies(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze dependencies between tasks.
        
        Args:
            tasks: List of task dictionaries
            
        Returns:
            Tasks with validated dependencies and additional metadata
        """
        logger.info(f"Analyzing dependencies for {len(tasks)} tasks")
        
        # Create a mapping of task IDs to tasks
        task_map = {task["id"]: task for task in tasks}
        
        # Create a directed graph of dependencies
        dependency_graph = nx.DiGraph()
        
        # Add all tasks as nodes
        for task in tasks:
            dependency_graph.add_node(task["id"])
        
        # Add dependencies as edges
        for task in tasks:
            for dep_id in task.get("dependencies", []):
                # Check if the dependency exists
                if dep_id in task_map:
                    dependency_graph.add_edge(dep_id, task["id"])
                else:
                    logger.warning(f"Task {task['id']} depends on non-existent task {dep_id}")
                    # Remove the invalid dependency
                    task["dependencies"].remove(dep_id)
        
        # Check for cycles
        try:
            cycles = list(nx.simple_cycles(dependency_graph))
            if cycles:
                logger.warning(f"Detected dependency cycles: {cycles}")
                # Break cycles by removing the last dependency in each cycle
                for cycle in cycles:
                    # Remove the edge from the last node to the first node
                    last_node = cycle[-1]
                    first_node = cycle[0]
                    if dependency_graph.has_edge(last_node, first_node):
                        dependency_graph.remove_edge(last_node, first_node)
                        # Update the task dependencies
                        task_map[last_node]["dependencies"].remove(first_node)
                        logger.info(f"Removed dependency from {last_node} to {first_node} to break cycle")
        except nx.NetworkXNoCycle:
            # No cycles detected
            pass
        
        # Calculate the depth of each task (longest path to the task)
        depths = {}
        for task_id in task_map:
            # Find all paths to this task
            paths = []
            for node in dependency_graph.nodes:
                if node != task_id:
                    try:
                        for path in nx.all_simple_paths(dependency_graph, node, task_id):
                            paths.append(path)
                    except (nx.NetworkXNoPath, nx.NodeNotFound):
                        pass
            
            # Calculate the depth as the length of the longest path
            depth = max([len(path) for path in paths]) if paths else 0
            depths[task_id] = depth
        
        # Add depth information to tasks
        for task in tasks:
            task["depth"] = depths.get(task["id"], 0)
        
        # Calculate the number of dependent tasks
        for task in tasks:
            dependent_tasks = []
            for other_task in tasks:
                if task["id"] in other_task.get("dependencies", []):
                    dependent_tasks.append(other_task["id"])
            task["dependent_tasks"] = dependent_tasks
            task["dependent_count"] = len(dependent_tasks)
        
        return tasks
