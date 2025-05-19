const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const queueService = require('../services/queueService');
const openRouterService = require('../services/openRouterService');
const supabase = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Create tasks from a specification
 * @route   POST /api/tasks/create
 * @access  Public/Private
 */
const createTasks = asyncHandler(async (req, res) => {
  // Validate request data
  const specTaskId = req.body.specTaskId;
  
  if (!specTaskId) {
    throw new ApiError(400, 'Specification task ID is required');
  }
  
  // Get the specification task
  const specTask = queueService.getTaskStatus(specTaskId);
  
  if (specTask.error) {
    throw new ApiError(404, specTask.error);
  }
  
  if (specTask.status !== 'completed') {
    throw new ApiError(400, `Specification task is not completed: ${specTaskId}`);
  }
  
  // Create tasks record if specification ID is available
  let tasksId = null;
  if (specTask.result && specTask.result.specificationId && req.user) {
    try {
      // Get the specification
      const { data: specification, error: specError } = await supabase
        .from('specifications')
        .select('*, video_analyses!inner(*, projects!inner(*))')
        .eq('id', specTask.result.specificationId)
        .single();
      
      if (specError || !specification) {
        throw new ApiError(404, 'Specification not found');
      }
      
      // Check if user has access to the project
      if (specification.video_analyses.projects.user_id !== req.user.id) {
        throw new ApiError(403, 'Not authorized to access this specification');
      }
      
      // Create tasks record
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .insert([
          {
            specification_id: specTask.result.specificationId,
            status: 'processing',
          },
        ])
        .select()
        .single();
      
      if (tasksError) {
        throw new ApiError(500, 'Error creating tasks record');
      }
      
      tasksId = tasks.id;
    } catch (error) {
      // Re-throw the error
      throw error;
    }
  }
  
  // Enqueue the task generation task
  const taskData = {
    specification: specTask.result,
    tasksId,
  };
  
  const taskId = await queueService.enqueueTaskGenerationTask('create_tasks', taskData);
  
  // Return response
  res.status(200).json({
    success: true,
    data: {
      taskId,
      message: 'Task generation started',
      tasksId,
    },
  });
});

/**
 * @desc    Get tasks
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTasks = asyncHandler(async (req, res) => {
  const tasksId = req.params.id;
  
  // Get tasks
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, specifications!inner(*, video_analyses!inner(*, projects!inner(*)))')
    .eq('id', tasksId)
    .single();
  
  if (error || !tasks) {
    throw new ApiError(404, 'Tasks not found');
  }
  
  // Check if user has access to the project
  if (tasks.specifications.video_analyses.projects.user_id !== req.user.id) {
    throw new ApiError(403, 'Not authorized to access these tasks');
  }
  
  // Return response
  res.status(200).json({
    success: true,
    data: tasks,
  });
});

/**
 * @desc    Get tasks for a specification
 * @route   GET /api/tasks/specification/:specificationId
 * @access  Private
 */
const getSpecificationTasks = asyncHandler(async (req, res) => {
  const specificationId = req.params.specificationId;
  
  // Get the specification
  const { data: specification, error: specError } = await supabase
    .from('specifications')
    .select('*, video_analyses!inner(*, projects!inner(*))')
    .eq('id', specificationId)
    .single();
  
  if (specError || !specification) {
    throw new ApiError(404, 'Specification not found');
  }
  
  // Check if user has access to the project
  if (specification.video_analyses.projects.user_id !== req.user.id) {
    throw new ApiError(403, 'Not authorized to access this specification');
  }
  
  // Get tasks for the specification
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('specification_id', specificationId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new ApiError(500, 'Error getting tasks');
  }
  
  // Return response
  res.status(200).json({
    success: true,
    data: tasks,
  });
});

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const { status, completedAt } = req.body;
  
  // Validate status
  if (status && !['not_started', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }
  
  // Get the task
  const { data: task, error: taskError } = await supabase
    .from('task_items')
    .select('*, tasks!inner(*, specifications!inner(*, video_analyses!inner(*, projects!inner(*))))')
    .eq('id', taskId)
    .single();
  
  if (taskError || !task) {
    throw new ApiError(404, 'Task not found');
  }
  
  // Check if user has access to the project
  if (task.tasks.specifications.video_analyses.projects.user_id !== req.user.id) {
    throw new ApiError(403, 'Not authorized to update this task');
  }
  
  // Update the task
  const updateData = {};
  if (status) {
    updateData.status = status;
  }
  if (completedAt) {
    updateData.completed_at = completedAt;
  }
  
  const { data: updatedTask, error } = await supabase
    .from('task_items')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();
  
  if (error) {
    throw new ApiError(500, 'Error updating task');
  }
  
  // Return response
  res.status(200).json({
    success: true,
    data: updatedTask,
  });
});

// Register task handlers
queueService.registerHandler('create_tasks', async (data) => {
  try {
    const { specification, tasksId } = data;
    
    // Generate task creation prompt
    const prompt = openRouterService.generateTaskCreationPrompt(specification);
    
    // Generate tasks with AI
    const systemPrompt = "You are an expert software development assistant that converts software specifications into actionable development tasks.";
    const tasksText = await openRouterService.generateCompletion(prompt, systemPrompt, null, 3000);
    
    // Parse the tasks
    const tasks = parseTasks(tasksText);
    
    // Update tasks record if available
    if (tasksId) {
      // First update the main tasks record
      const { error: tasksError } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          raw_text: tasksText,
        })
        .eq('id', tasksId);
      
      if (tasksError) {
        logger.error('Error updating tasks record:', tasksError);
      }
      
      // Then insert the individual task items
      const taskItems = tasks.map(task => ({
        tasks_id: tasksId,
        task_id: task.id,
        name: task.name,
        description: task.description,
        category: task.category,
        priority: task.priority,
        dependencies: task.dependencies,
        estimate: task.estimate,
        status: 'not_started',
      }));
      
      const { error: itemsError } = await supabase
        .from('task_items')
        .insert(taskItems);
      
      if (itemsError) {
        logger.error('Error inserting task items:', itemsError);
      }
    }
    
    return {
      tasks,
      rawText: tasksText,
    };
  } catch (error) {
    logger.error('Error in create_tasks handler:', error);
    throw error;
  }
});

/**
 * Parse tasks text into structured format
 * @param {string} text - Tasks text
 * @returns {Array<object>} - Structured tasks
 */
const parseTasks = (text) => {
  // In a real implementation, this would parse the AI-generated text
  // into a structured format. For now, we'll return sample tasks.
  return [
    {
      id: 'T1',
      name: 'Set up project structure',
      description: 'Initialize the project and set up the basic directory structure',
      category: 'Setup',
      priority: 'High',
      dependencies: [],
      estimate: '2 hours',
    },
    {
      id: 'T2',
      name: 'Implement user authentication',
      description: 'Set up user registration and login functionality',
      category: 'Backend',
      priority: 'High',
      dependencies: ['T1'],
      estimate: '4 hours',
    },
    {
      id: 'T3',
      name: 'Create video upload component',
      description: 'Implement the frontend component for uploading videos',
      category: 'Frontend',
      priority: 'Medium',
      dependencies: ['T1', 'T2'],
      estimate: '3 hours',
    },
  ];
};

module.exports = {
  createTasks,
  getTasks,
  getSpecificationTasks,
  updateTask,
};
