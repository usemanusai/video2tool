const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const queueService = require('../services/queueService');
const supabase = require('../config/supabase');
const config = require('../config');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Validate export request data
 * @param {object} data - Export request data
 * @returns {object} - Validated data
 */
const validateExportData = (data) => {
  const schema = Joi.object({
    format: Joi.string().valid('json', 'markdown', 'pdf', 'html', 'text').required(),
    includeVisualElements: Joi.boolean().default(true),
    includeTranscription: Joi.boolean().default(true),
  });
  
  const { error, value } = schema.validate(data);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
  
  return value;
};

/**
 * @desc    Export specification
 * @route   POST /api/export/specification/:id
 * @access  Private
 */
const exportSpecification = asyncHandler(async (req, res) => {
  const specId = req.params.id;
  
  // Validate request data
  const { format, includeVisualElements, includeTranscription } = validateExportData(req.body);
  
  // Get the specification
  const { data: specification, error: specError } = await supabase
    .from('specifications')
    .select('*, video_analyses!inner(*, projects!inner(*))')
    .eq('id', specId)
    .single();
  
  if (specError || !specification) {
    throw new ApiError(404, 'Specification not found');
  }
  
  // Check if user has access to the project
  if (specification.video_analyses.projects.user_id !== req.user.id) {
    throw new ApiError(403, 'Not authorized to access this specification');
  }
  
  // Generate export filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `specification_${specification.id}_${timestamp}`;
  
  // Generate export data
  const exportData = generateSpecificationExport(
    specification,
    includeVisualElements,
    includeTranscription
  );
  
  // Export the data in the requested format
  const exportPath = await exportData(exportData, format, filename);
  
  // Return the file
  res.download(exportPath, `${filename}.${getFileExtension(format)}`, (err) => {
    if (err) {
      logger.error('Error sending file:', err);
    }
    
    // Clean up the file after sending
    fs.unlink(exportPath, (unlinkErr) => {
      if (unlinkErr) {
        logger.error('Error deleting temporary export file:', unlinkErr);
      }
    });
  });
});

/**
 * @desc    Export tasks
 * @route   POST /api/export/tasks/:id
 * @access  Private
 */
const exportTasks = asyncHandler(async (req, res) => {
  const tasksId = req.params.id;
  
  // Validate request data
  const { format } = validateExportData(req.body);
  
  // Get the tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*, specifications!inner(*, video_analyses!inner(*, projects!inner(*)))')
    .eq('id', tasksId)
    .single();
  
  if (tasksError || !tasks) {
    throw new ApiError(404, 'Tasks not found');
  }
  
  // Check if user has access to the project
  if (tasks.specifications.video_analyses.projects.user_id !== req.user.id) {
    throw new ApiError(403, 'Not authorized to access these tasks');
  }
  
  // Get task items
  const { data: taskItems, error: itemsError } = await supabase
    .from('task_items')
    .select('*')
    .eq('tasks_id', tasksId);
  
  if (itemsError) {
    throw new ApiError(500, 'Error getting task items');
  }
  
  // Generate export filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tasks_${tasks.id}_${timestamp}`;
  
  // Generate export data
  const exportData = generateTasksExport(tasks, taskItems);
  
  // Export the data in the requested format
  const exportPath = await exportData(exportData, format, filename);
  
  // Return the file
  res.download(exportPath, `${filename}.${getFileExtension(format)}`, (err) => {
    if (err) {
      logger.error('Error sending file:', err);
    }
    
    // Clean up the file after sending
    fs.unlink(exportPath, (unlinkErr) => {
      if (unlinkErr) {
        logger.error('Error deleting temporary export file:', unlinkErr);
      }
    });
  });
});

/**
 * @desc    Export complete analysis (specification and tasks)
 * @route   POST /api/export/complete/:specId/:tasksId
 * @access  Private
 */
const exportComplete = asyncHandler(async (req, res) => {
  const specId = req.params.specId;
  const tasksId = req.params.tasksId;
  
  // Validate request data
  const { format } = validateExportData(req.body);
  
  // Get the specification
  const { data: specification, error: specError } = await supabase
    .from('specifications')
    .select('*, video_analyses!inner(*, projects!inner(*))')
    .eq('id', specId)
    .single();
  
  if (specError || !specification) {
    throw new ApiError(404, 'Specification not found');
  }
  
  // Check if user has access to the project
  if (specification.video_analyses.projects.user_id !== req.user.id) {
    throw new ApiError(403, 'Not authorized to access this specification');
  }
  
  // Get the tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', tasksId)
    .eq('specification_id', specId)
    .single();
  
  if (tasksError || !tasks) {
    throw new ApiError(404, 'Tasks not found');
  }
  
  // Get task items
  const { data: taskItems, error: itemsError } = await supabase
    .from('task_items')
    .select('*')
    .eq('tasks_id', tasksId);
  
  if (itemsError) {
    throw new ApiError(500, 'Error getting task items');
  }
  
  // Generate export filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `video2tool_export_${timestamp}`;
  
  // Generate export data
  const exportData = {
    specification: generateSpecificationExport(specification, true, true),
    tasks: generateTasksExport(tasks, taskItems),
    metadata: {
      exportedAt: new Date().toISOString(),
      projectName: specification.video_analyses.projects.name,
      projectDescription: specification.video_analyses.projects.description,
    },
  };
  
  // Export the data in the requested format
  const exportPath = await exportData(exportData, format, filename);
  
  // Return the file
  res.download(exportPath, `${filename}.${getFileExtension(format)}`, (err) => {
    if (err) {
      logger.error('Error sending file:', err);
    }
    
    // Clean up the file after sending
    fs.unlink(exportPath, (unlinkErr) => {
      if (unlinkErr) {
        logger.error('Error deleting temporary export file:', unlinkErr);
      }
    });
  });
});

/**
 * Generate specification export data
 * @param {object} specification - Specification data
 * @param {boolean} includeVisualElements - Whether to include visual elements
 * @param {boolean} includeTranscription - Whether to include transcription
 * @returns {object} - Export data
 */
const generateSpecificationExport = (specification, includeVisualElements, includeTranscription) => {
  const exportData = {
    id: specification.id,
    title: specification.title,
    description: specification.description,
    content: specification.content,
    createdAt: specification.created_at,
    status: specification.status,
    project: {
      id: specification.video_analyses.projects.id,
      name: specification.video_analyses.projects.name,
      description: specification.video_analyses.projects.description,
    },
    videoAnalysis: {
      id: specification.video_analyses.id,
      videoName: specification.video_analyses.video_name,
      summary: specification.video_analyses.summary,
    },
  };
  
  if (includeTranscription) {
    exportData.videoAnalysis.transcription = specification.video_analyses.transcription;
  }
  
  if (includeVisualElements) {
    exportData.videoAnalysis.visualElements = specification.video_analyses.visual_elements;
  }
  
  return exportData;
};

/**
 * Generate tasks export data
 * @param {object} tasks - Tasks data
 * @param {Array<object>} taskItems - Task items
 * @returns {object} - Export data
 */
const generateTasksExport = (tasks, taskItems) => {
  return {
    id: tasks.id,
    specificationId: tasks.specification_id,
    status: tasks.status,
    createdAt: tasks.created_at,
    items: taskItems.map(item => ({
      id: item.id,
      taskId: item.task_id,
      name: item.name,
      description: item.description,
      category: item.category,
      priority: item.priority,
      dependencies: item.dependencies,
      estimate: item.estimate,
      status: item.status,
      completedAt: item.completed_at,
    })),
  };
};

/**
 * Export data in the specified format
 * @param {object} data - Data to export
 * @param {string} format - Export format
 * @param {string} filename - Output filename (without extension)
 * @returns {Promise<string>} - Path to the exported file
 */
const exportData = async (data, format, filename) => {
  const outputDir = config.storage.outputDir;
  const outputPath = path.join(outputDir, `${filename}.${getFileExtension(format)}`);
  
  switch (format) {
    case 'json':
      await fs.promises.writeFile(outputPath, JSON.stringify(data, null, 2));
      break;
    case 'markdown':
      await fs.promises.writeFile(outputPath, generateMarkdown(data));
      break;
    case 'text':
      await fs.promises.writeFile(outputPath, generateText(data));
      break;
    case 'html':
      await fs.promises.writeFile(outputPath, generateHtml(data));
      break;
    case 'pdf':
      // In a real implementation, this would generate a PDF
      // For now, we'll just create a text file
      await fs.promises.writeFile(outputPath, generateText(data));
      break;
    default:
      throw new ApiError(400, `Unsupported export format: ${format}`);
  }
  
  return outputPath;
};

/**
 * Get file extension for export format
 * @param {string} format - Export format
 * @returns {string} - File extension
 */
const getFileExtension = (format) => {
  switch (format) {
    case 'json': return 'json';
    case 'markdown': return 'md';
    case 'text': return 'txt';
    case 'html': return 'html';
    case 'pdf': return 'pdf';
    default: return 'txt';
  }
};

/**
 * Generate Markdown from export data
 * @param {object} data - Export data
 * @returns {string} - Markdown text
 */
const generateMarkdown = (data) => {
  // In a real implementation, this would generate proper Markdown
  // For now, we'll return a simple representation
  return `# Export\n\n${JSON.stringify(data, null, 2)}`;
};

/**
 * Generate plain text from export data
 * @param {object} data - Export data
 * @returns {string} - Plain text
 */
const generateText = (data) => {
  // In a real implementation, this would generate proper text
  // For now, we'll return a simple representation
  return `Export\n\n${JSON.stringify(data, null, 2)}`;
};

/**
 * Generate HTML from export data
 * @param {object} data - Export data
 * @returns {string} - HTML text
 */
const generateHtml = (data) => {
  // In a real implementation, this would generate proper HTML
  // For now, we'll return a simple representation
  return `<!DOCTYPE html>
<html>
<head>
  <title>Export</title>
</head>
<body>
  <h1>Export</h1>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>`;
};

module.exports = {
  exportSpecification,
  exportTasks,
  exportComplete,
};
