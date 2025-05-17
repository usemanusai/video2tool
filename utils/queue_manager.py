"""
Module for managing processing queues.
"""

import logging
import time
import uuid
import threading
from typing import Dict, List, Any, Callable, Optional
from queue import Queue, Empty
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class Task:
    """Class representing a task in the processing queue."""
    id: str
    type: str
    data: Dict[str, Any]
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None

class QueueManager:
    """
    Class for managing processing queues.
    
    Handles:
    - Task queuing
    - Worker threads
    - Task status tracking
    - Result retrieval
    """
    
    def __init__(self, num_workers: int = 2):
        """
        Initialize the QueueManager.
        
        Args:
            num_workers: Number of worker threads
        """
        self.task_queue = Queue()
        self.tasks = {}  # Task ID -> Task
        self.handlers = {}  # Task type -> handler function
        self.workers = []
        self.num_workers = num_workers
        self.running = False
    
    def register_handler(self, task_type: str, handler: Callable[[Dict[str, Any]], Dict[str, Any]]):
        """
        Register a handler function for a task type.
        
        Args:
            task_type: Type of task
            handler: Handler function that processes the task
        """
        logger.info(f"Registering handler for task type: {task_type}")
        self.handlers[task_type] = handler
    
    def start(self):
        """Start the worker threads."""
        if self.running:
            return
        
        logger.info(f"Starting {self.num_workers} worker threads")
        self.running = True
        
        for i in range(self.num_workers):
            worker = threading.Thread(target=self._worker_loop, daemon=True)
            worker.start()
            self.workers.append(worker)
    
    def stop(self):
        """Stop the worker threads."""
        logger.info("Stopping worker threads")
        self.running = False
        
        # Wait for workers to finish
        for worker in self.workers:
            if worker.is_alive():
                worker.join(timeout=1.0)
        
        self.workers = []
    
    def enqueue_task(self, task_type: str, data: Dict[str, Any]) -> str:
        """
        Enqueue a task for processing.
        
        Args:
            task_type: Type of task
            data: Task data
            
        Returns:
            Task ID
        """
        if task_type not in self.handlers:
            raise ValueError(f"No handler registered for task type: {task_type}")
        
        # Create a task
        task_id = str(uuid.uuid4())
        task = Task(id=task_id, type=task_type, data=data)
        
        # Store the task
        self.tasks[task_id] = task
        
        # Enqueue the task
        self.task_queue.put(task_id)
        logger.info(f"Enqueued task {task_id} of type {task_type}")
        
        return task_id
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the status of a task.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task status information
        """
        if task_id not in self.tasks:
            return {"error": f"Task not found: {task_id}"}
        
        task = self.tasks[task_id]
        
        return {
            "id": task.id,
            "type": task.type,
            "status": task.status,
            "created_at": task.created_at,
            "started_at": task.started_at,
            "completed_at": task.completed_at,
            "result": task.result,
            "error": task.error
        }
    
    def get_all_tasks(self) -> List[Dict[str, Any]]:
        """
        Get information about all tasks.
        
        Returns:
            List of task status dictionaries
        """
        return [self.get_task_status(task_id) for task_id in self.tasks]
    
    def _worker_loop(self):
        """Worker thread function."""
        logger.info("Worker thread started")
        
        while self.running:
            try:
                # Get a task from the queue with a timeout
                task_id = self.task_queue.get(timeout=1.0)
                
                # Process the task
                self._process_task(task_id)
                
                # Mark the task as done
                self.task_queue.task_done()
                
            except Empty:
                # Queue is empty, just continue
                continue
            except Exception as e:
                logger.error(f"Error in worker thread: {e}")
        
        logger.info("Worker thread stopped")
    
    def _process_task(self, task_id: str):
        """
        Process a task.
        
        Args:
            task_id: Task ID
        """
        if task_id not in self.tasks:
            logger.error(f"Task not found: {task_id}")
            return
        
        task = self.tasks[task_id]
        
        # Update task status
        task.status = "processing"
        task.started_at = time.time()
        
        try:
            # Get the handler for this task type
            handler = self.handlers[task.type]
            
            # Call the handler
            logger.info(f"Processing task {task_id} of type {task.type}")
            result = handler(task.data)
            
            # Update task with result
            task.status = "completed"
            task.result = result
            task.completed_at = time.time()
            
            logger.info(f"Task {task_id} completed successfully")
            
        except Exception as e:
            # Update task with error
            task.status = "failed"
            task.error = str(e)
            task.completed_at = time.time()
            
            logger.error(f"Error processing task {task_id}: {e}")
    
    def clean_old_tasks(self, max_age_hours: float = 24.0):
        """
        Clean up old completed tasks.
        
        Args:
            max_age_hours: Maximum age of tasks to keep (in hours)
        """
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        # Find old tasks
        old_task_ids = []
        for task_id, task in self.tasks.items():
            if task.status in ["completed", "failed"]:
                if task.completed_at and (current_time - task.completed_at) > max_age_seconds:
                    old_task_ids.append(task_id)
        
        # Remove old tasks
        for task_id in old_task_ids:
            del self.tasks[task_id]
        
        if old_task_ids:
            logger.info(f"Cleaned up {len(old_task_ids)} old tasks")
