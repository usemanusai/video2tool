const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const queueService = require('../services/queueService');
const openRouterService = require('../services/openRouterService');
const supabase = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Validate specification generation data
 * @param {object} data - Specification generation data
 * @returns {object} - Validated data
 */
const validateSpecGenData = (data) => {
  const schema = Joi.object({
    videoTaskId: Joi.string().required(),
    title: Joi.string().default('Software Specification'),
    description: Joi.string().allow('', null),
  });
  
  const { error, value } = schema.validate(data);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
  
  return value;
};

/**
 * @desc    Generate a specification from video analysis
 * @route   POST /api/specifications/generate
 * @access  Public/Private
 */
const generateSpecification = asyncHandler(async (req, res) => {
  // Validate request data
  const { videoTaskId, title, description } = validateSpecGenData(req.body);
  
  // Get the video processing task
  const videoTask = queueService.getTaskStatus(videoTaskId);
  
  if (videoTask.error) {
    throw new ApiError(404, videoTask.error);
  }
  
  if (videoTask.status !== 'completed') {
    throw new ApiError(400, `Video task is not completed: ${videoTaskId}`);
  }
  
  // Create specification record if video analysis ID is available
  let specificationId = null;
  if (videoTask.result && videoTask.result.videoAnalysisId && req.user) {
    try {
      // Get the video analysis
      const { data: videoAnalysis, error: analysisError } = await supabase
        .from('video_analyses')
        .select('*, projects!inner(*)')
        .eq('id', videoTask.result.videoAnalysisId)
        .single();
      
      if (analysisError || !videoAnalysis) {
        throw new ApiError(404, 'Video analysis not found');
      }
      
      // Check if user has access to the project
      if (videoAnalysis.projects.user_id !== req.user.id) {
        throw new ApiError(403, 'Not authorized to access this video analysis');
      }
      
      // Create specification record
      const { data: specification, error: specError } = await supabase
        .from('specifications')
        .insert([
          {
            video_analysis_id: videoTask.result.videoAnalysisId,
            title,
            description,
            status: 'processing',
          },
        ])
        .select()
        .single();
      
      if (specError) {
        throw new ApiError(500, 'Error creating specification record');
      }
      
      specificationId = specification.id;
    } catch (error) {
      // Re-throw the error
      throw error;
    }
  }
  
  // Enqueue the specification generation task
  const taskData = {
    videoAnalysis: videoTask.result,
    specificationId,
    title,
    description,
  };
  
  const taskId = await queueService.enqueueSpecTask('generate_specification', taskData);
  
  // Return response
  res.status(200).json({
    success: true,
    data: {
      taskId,
      message: 'Specification generation started',
      specificationId,
    },
  });
});

/**
 * @desc    Get specification
 * @route   GET /api/specifications/:id
 * @access  Private
 */
const getSpecification = asyncHandler(async (req, res) => {
  const specId = req.params.id;
  
  // Get specification
  const { data: specification, error } = await supabase
    .from('specifications')
    .select('*, video_analyses!inner(*, projects!inner(*))')
    .eq('id', specId)
    .single();
  
  if (error || !specification) {
    throw new ApiError(404, 'Specification not found');
  }
  
  // Check if user has access to the project
  if (specification.video_analyses.projects.user_id !== req.user.id) {
    throw new ApiError(403, 'Not authorized to access this specification');
  }
  
  // Return response
  res.status(200).json({
    success: true,
    data: specification,
  });
});

/**
 * @desc    Get specifications for a project
 * @route   GET /api/specifications/project/:projectId
 * @access  Private
 */
const getProjectSpecifications = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  
  // Verify the project belongs to the user
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', req.user.id)
    .single();
  
  if (projectError || !project) {
    throw new ApiError(403, 'Not authorized to access this project');
  }
  
  // Get specifications for the project
  const { data: specifications, error } = await supabase
    .from('specifications')
    .select('*, video_analyses!inner(*)')
    .eq('video_analyses.project_id', projectId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new ApiError(500, 'Error getting specifications');
  }
  
  // Return response
  res.status(200).json({
    success: true,
    data: specifications,
  });
});

// Register task handlers
queueService.registerHandler('generate_specification', async (data) => {
  try {
    const { videoAnalysis, specificationId, title, description } = data;
    
    // Generate specification prompt
    const prompt = openRouterService.generateSpecificationPrompt(videoAnalysis);
    
    // Generate specification with AI
    const systemPrompt = "You are an expert software development assistant that analyzes video content and extracts detailed software specifications.";
    const specificationText = await openRouterService.generateCompletion(prompt, systemPrompt, null, 3000);
    
    // Parse the specification
    const specification = parseSpecification(specificationText, title, description);
    
    // Update specification record if available
    if (specificationId) {
      const { error } = await supabase
        .from('specifications')
        .update({
          status: 'completed',
          content: specification,
          raw_text: specificationText,
        })
        .eq('id', specificationId);
      
      if (error) {
        logger.error('Error updating specification record:', error);
      }
    }
    
    return specification;
  } catch (error) {
    logger.error('Error in generate_specification handler:', error);
    throw error;
  }
});

/**
 * Parse specification text into structured format
 * @param {string} text - Specification text
 * @param {string} title - Specification title
 * @param {string} description - Specification description
 * @returns {object} - Structured specification
 */
const parseSpecification = (text, title, description) => {
  // In a real implementation, this would parse the AI-generated text
  // into a structured format. For now, we'll return a simple structure.
  return {
    title,
    description,
    overview: {
      text: "Overview section from the generated specification",
    },
    user_stories: [
      "As a user, I want to upload videos so that I can analyze them",
      "As a user, I want to generate specifications from videos so that I can plan development",
    ],
    functional_requirements: [
      "The system shall allow users to upload videos",
      "The system shall transcribe video content",
      "The system shall analyze visual elements in videos",
      "The system shall generate software specifications",
    ],
    non_functional_requirements: {
      text: "Non-functional requirements section from the generated specification",
    },
    ui_ux_guidelines: {
      text: "UI/UX guidelines section from the generated specification",
    },
    technical_architecture: {
      text: "Technical architecture section from the generated specification",
    },
    implementation_considerations: {
      text: "Implementation considerations section from the generated specification",
    },
  };
};

module.exports = {
  generateSpecification,
  getSpecification,
  getProjectSpecifications,
};
