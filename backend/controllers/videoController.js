const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const videoService = require('../services/videoService');
const queueService = require('../services/queueService');
const supabase = require('../config/supabase');
const config = require('../config');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Validate video URL data
 * @param {object} data - Video URL data
 * @returns {object} - Validated data
 */
const validateVideoUrlData = (data) => {
  const schema = Joi.object({
    videoUrl: Joi.string().uri().required(),
    projectId: Joi.string().optional(),
  });
  
  const { error, value } = schema.validate(data);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
  
  return value;
};

/**
 * @desc    Upload and process a video file
 * @route   POST /api/videos/upload
 * @access  Public/Private
 */
const uploadVideo = asyncHandler(async (req, res) => {
  // Check if file was uploaded
  if (!req.file) {
    throw new ApiError(400, 'No video file uploaded');
  }
  
  // Get file path and project ID
  const videoPath = req.file.path;
  const projectId = req.body.projectId;
  
  // Create video analysis record if project ID is provided
  let videoAnalysisId = null;
  if (projectId && req.user) {
    try {
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
      
      // Create video analysis record
      const { data: videoAnalysis, error: videoError } = await supabase
        .from('video_analyses')
        .insert([
          {
            project_id: projectId,
            video_name: req.file.originalname,
            video_file_path: videoPath,
            status: 'processing',
          },
        ])
        .select()
        .single();
      
      if (videoError) {
        throw new ApiError(500, 'Error creating video analysis record');
      }
      
      videoAnalysisId = videoAnalysis.id;
    } catch (error) {
      // Clean up the uploaded file
      fs.unlinkSync(videoPath);
      
      // Re-throw the error
      throw error;
    }
  }
  
  // Enqueue the video processing task
  const taskData = {
    videoPath,
    videoAnalysisId,
  };
  
  const taskId = await queueService.enqueueVideoTask('process_video', taskData);
  
  // Return response
  res.status(200).json({
    success: true,
    data: {
      taskId,
      message: 'Video uploaded and processing started',
      videoAnalysisId,
    },
  });
});

/**
 * @desc    Process a video from URL
 * @route   POST /api/videos/process-url
 * @access  Public/Private
 */
const processVideoUrl = asyncHandler(async (req, res) => {
  // Validate request data
  const { videoUrl, projectId } = validateVideoUrlData(req.body);
  
  // Download the video
  const videoPath = await downloadVideo(videoUrl);
  
  // Create video analysis record if project ID is provided
  let videoAnalysisId = null;
  if (projectId && req.user) {
    try {
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
      
      // Extract video name from URL
      const videoName = path.basename(new URL(videoUrl).pathname);
      
      // Create video analysis record
      const { data: videoAnalysis, error: videoError } = await supabase
        .from('video_analyses')
        .insert([
          {
            project_id: projectId,
            video_name: videoName,
            video_url: videoUrl,
            video_file_path: videoPath,
            status: 'processing',
          },
        ])
        .select()
        .single();
      
      if (videoError) {
        throw new ApiError(500, 'Error creating video analysis record');
      }
      
      videoAnalysisId = videoAnalysis.id;
    } catch (error) {
      // Clean up the downloaded file
      fs.unlinkSync(videoPath);
      
      // Re-throw the error
      throw error;
    }
  }
  
  // Enqueue the video processing task
  const taskData = {
    videoPath,
    videoAnalysisId,
  };
  
  const taskId = await queueService.enqueueVideoTask('process_video', taskData);
  
  // Return response
  res.status(200).json({
    success: true,
    data: {
      taskId,
      message: 'Video URL processing started',
      videoAnalysisId,
    },
  });
});

/**
 * @desc    Get task status
 * @route   GET /api/videos/task/:taskId
 * @access  Public
 */
const getTaskStatus = asyncHandler(async (req, res) => {
  const taskId = req.params.taskId;
  
  // Get task status
  const taskStatus = queueService.getTaskStatus(taskId);
  
  if (taskStatus.error) {
    throw new ApiError(404, taskStatus.error);
  }
  
  // Return response
  res.status(200).json({
    success: true,
    data: taskStatus,
  });
});

/**
 * @desc    Get video analysis
 * @route   GET /api/videos/analysis/:id
 * @access  Private
 */
const getVideoAnalysis = asyncHandler(async (req, res) => {
  const analysisId = req.params.id;
  
  // Get video analysis
  const { data: videoAnalysis, error } = await supabase
    .from('video_analyses')
    .select('*, projects!inner(*)')
    .eq('id', analysisId)
    .single();
  
  if (error || !videoAnalysis) {
    throw new ApiError(404, 'Video analysis not found');
  }
  
  // Check if user has access to the project
  if (videoAnalysis.projects.user_id !== req.user.id) {
    throw new ApiError(403, 'Not authorized to access this video analysis');
  }
  
  // Return response
  res.status(200).json({
    success: true,
    data: videoAnalysis,
  });
});

/**
 * Download a video from URL
 * @param {string} url - Video URL
 * @returns {Promise<string>} - Path to downloaded video
 */
const downloadVideo = async (url) => {
  try {
    // Create a unique filename
    const ext = path.extname(new URL(url).pathname) || '.mp4';
    const filename = `${uuidv4()}${ext}`;
    const videoPath = path.join(config.storage.uploadDir, filename);
    
    // Download the video
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
    });
    
    // Save the video
    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(videoPath));
      writer.on('error', reject);
    });
  } catch (error) {
    logger.error('Error downloading video:', error);
    throw new ApiError(500, 'Error downloading video');
  }
};

// Register task handlers
queueService.registerHandler('process_video', async (data) => {
  try {
    const { videoPath, videoAnalysisId } = data;
    
    // Process the video
    const result = await videoService.processVideo(videoPath);
    
    // Update video analysis record if available
    if (videoAnalysisId) {
      const { error } = await supabase
        .from('video_analyses')
        .update({
          status: 'completed',
          transcription: result.transcription,
          visual_elements: result.visualElements,
          summary: result.summary,
          metadata: result.metadata,
        })
        .eq('id', videoAnalysisId);
      
      if (error) {
        logger.error('Error updating video analysis record:', error);
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Error in process_video handler:', error);
    throw error;
  }
});

module.exports = {
  uploadVideo,
  processVideoUrl,
  getTaskStatus,
  getVideoAnalysis,
};
