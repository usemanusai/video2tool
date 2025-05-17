import apiRequest from './client';
import {
  CreateProjectRequest,
  CreateTaskRequest,
  CreateTasksRequest,
  IntegrationAuthRequest,
  IntegrationType,
} from '@/types/api';

export const integrationService = {
  // Get available integration types
  getIntegrationTypes: async (): Promise<string[]> => {
    return apiRequest<string[]>({
      method: 'GET',
      url: '/integrations/types',
    });
  },

  // Authenticate with an integration
  authenticateIntegration: async (
    authRequest: IntegrationAuthRequest
  ): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>({
      method: 'POST',
      url: '/integrations/auth',
      data: authRequest,
    });
  },

  // Get initialized integrations
  getInitializedIntegrations: async (): Promise<string[]> => {
    return apiRequest<string[]>({
      method: 'GET',
      url: '/integrations/initialized',
    });
  },

  // Create a project in an integration
  createIntegrationProject: async (
    projectRequest: CreateProjectRequest
  ): Promise<any> => {
    return apiRequest<any>({
      method: 'POST',
      url: '/integrations/projects',
      data: projectRequest,
    });
  },

  // Get projects from an integration
  getIntegrationProjects: async (
    integrationType: IntegrationType
  ): Promise<any[]> => {
    return apiRequest<any[]>({
      method: 'GET',
      url: '/integrations/projects',
      params: { integration_type: integrationType },
    });
  },

  // Create a task in an integration
  createIntegrationTask: async (
    taskRequest: CreateTaskRequest
  ): Promise<any> => {
    return apiRequest<any>({
      method: 'POST',
      url: '/integrations/tasks',
      data: taskRequest,
    });
  },

  // Create multiple tasks in an integration
  createIntegrationTasks: async (
    tasksRequest: CreateTasksRequest
  ): Promise<any[]> => {
    return apiRequest<any[]>({
      method: 'POST',
      url: '/integrations/tasks/batch',
      data: tasksRequest,
    });
  },

  // Get tasks from an integration project
  getIntegrationTasks: async (
    integrationType: IntegrationType,
    projectId: string
  ): Promise<any[]> => {
    return apiRequest<any[]>({
      method: 'GET',
      url: '/integrations/tasks',
      params: { integration_type: integrationType, project_id: projectId },
    });
  },

  // Export tasks to an integration
  exportToIntegration: async (
    taskTaskId: string,
    integrationType: IntegrationType,
    projectName: string
  ): Promise<any> => {
    return apiRequest<any>({
      method: 'POST',
      url: `/integrations/export/${taskTaskId}`,
      params: { integration_type: integrationType, project_name: projectName },
    });
  },
};
