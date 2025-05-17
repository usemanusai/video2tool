import apiRequest from './client';
import { ProcessingTask, TaskStatus, VideoAnalysis } from '@/types/api';
import axios from 'axios';

export const videoService = {
  // Get all video analyses for a project
  getVideoAnalyses: async (projectId: string): Promise<VideoAnalysis[]> => {
    return apiRequest<VideoAnalysis[]>({
      method: 'GET',
      url: '/videos',
      params: { project_id: projectId },
    });
  },

  // Get a video analysis by ID
  getVideoAnalysis: async (analysisId: string): Promise<VideoAnalysis> => {
    return apiRequest<VideoAnalysis>({
      method: 'GET',
      url: `/videos/${analysisId}`,
    });
  },

  // Upload a video file
  uploadVideo: async (file: File, projectId?: string): Promise<ProcessingTask> => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (projectId) {
      formData.append('project_id', projectId);
    }

    return apiRequest<ProcessingTask>({
      method: 'POST',
      url: '/upload',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Process a video from URL
  processVideoUrl: async (videoUrl: string, projectId?: string): Promise<ProcessingTask> => {
    return apiRequest<ProcessingTask>({
      method: 'POST',
      url: '/process-url',
      data: {
        video_url: videoUrl,
        project_id: projectId,
      },
    });
  },

  // Get task status
  getTaskStatus: async (taskId: string): Promise<TaskStatus> => {
    return apiRequest<TaskStatus>({
      method: 'GET',
      url: `/task-status/${taskId}`,
    });
  },

  // Generate specification from video analysis
  generateSpecification: async (
    videoTaskId: string,
    title?: string,
    description?: string
  ): Promise<ProcessingTask> => {
    const formData = new FormData();
    
    if (title) {
      formData.append('title', title);
    }
    
    if (description) {
      formData.append('description', description);
    }

    return apiRequest<ProcessingTask>({
      method: 'POST',
      url: `/generate-specification/${videoTaskId}`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Create tasks from specification
  createTasks: async (specTaskId: string): Promise<ProcessingTask> => {
    return apiRequest<ProcessingTask>({
      method: 'POST',
      url: `/create-tasks/${specTaskId}`,
    });
  },
};
