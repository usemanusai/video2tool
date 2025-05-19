import apiRequest from './client';
import { ExportFormat, ExportRequest } from '@/types/api';
import axios from 'axios';

export const exportService = {
  // Export specification
  exportSpecification: async (
    specTaskId: string,
    options: ExportRequest
  ): Promise<Blob> => {
    const response = await axios({
      method: 'POST',
      url: `/api/export/specification/${specTaskId}`,
      data: options,
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    return response.data;
  },

  // Export tasks
  exportTasks: async (
    tasksTaskId: string,
    options: ExportRequest
  ): Promise<Blob> => {
    const response = await axios({
      method: 'POST',
      url: `/api/export/tasks/${tasksTaskId}`,
      data: options,
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    return response.data;
  },

  // Export complete analysis
  exportCompleteAnalysis: async (
    videoAnalysisId: string,
    options: ExportRequest
  ): Promise<Blob> => {
    const response = await axios({
      method: 'POST',
      url: `/api/export/complete/${videoAnalysisId}`,
      data: options,
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    return response.data;
  },

  // Helper function to download a blob as a file
  downloadBlob: (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
