import apiRequest from './client';
import { Project, ProjectCreate } from '@/types/api';

export const projectService = {
  // Get all projects
  getProjects: async (): Promise<Project[]> => {
    return apiRequest<Project[]>({
      method: 'GET',
      url: '/projects',
    });
  },

  // Get a project by ID
  getProject: async (projectId: string): Promise<Project> => {
    return apiRequest<Project>({
      method: 'GET',
      url: `/projects/${projectId}`,
    });
  },

  // Create a new project
  createProject: async (projectData: ProjectCreate): Promise<Project> => {
    return apiRequest<Project>({
      method: 'POST',
      url: '/projects',
      data: projectData,
    });
  },
};
