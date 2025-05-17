import { ExportOptions } from '@/components/export/ExportDialog';
import apiClient from '@/api/apiClient';

/**
 * Service for handling exports
 */
class ExportService {
  /**
   * Export project data
   * @param projectId - Project ID
   * @param options - Export options
   * @returns Promise that resolves when export is complete
   */
  async exportProject(projectId: string, options: ExportOptions): Promise<void> {
    try {
      // For download destination, use browser download
      if (options.destination === 'download') {
        return this.downloadExport(projectId, options);
      }
      
      // For other destinations, use API
      const response = await apiClient.post(`/api/projects/${projectId}/export`, {
        format: options.format,
        destination: options.destination,
        contentTypes: options.contentTypes,
        options: {
          includeImages: options.includeImages,
          includeCode: options.includeCode,
          includeDiagrams: options.includeDiagrams,
        },
      });
      
      return response;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
  
  /**
   * Download export as a file
   * @param projectId - Project ID
   * @param options - Export options
   * @returns Promise that resolves when download is complete
   */
  private async downloadExport(projectId: string, options: ExportOptions): Promise<void> {
    try {
      // Get export data from API
      const response = await apiClient.post(
        `/api/projects/${projectId}/export/download`,
        {
          format: options.format,
          contentTypes: options.contentTypes,
          options: {
            includeImages: options.includeImages,
            includeCode: options.includeCode,
            includeDiagrams: options.includeDiagrams,
          },
        },
        {
          responseType: 'blob',
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on format
      const fileExtension = this.getFileExtension(options.format);
      link.setAttribute('download', `project_export.${fileExtension}`);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }
  
  /**
   * Get file extension for export format
   * @param format - Export format
   * @returns File extension
   */
  private getFileExtension(format: string): string {
    switch (format) {
      case 'markdown':
        return 'md';
      case 'html':
        return 'html';
      case 'pdf':
        return 'pdf';
      case 'json':
        return 'json';
      case 'csv':
        return 'csv';
      case 'images':
        return 'zip';
      default:
        return 'zip';
    }
  }
  
  /**
   * Export specification
   * @param specId - Specification ID
   * @param options - Export options
   * @returns Promise that resolves when export is complete
   */
  async exportSpecification(specId: string, options: ExportOptions): Promise<void> {
    try {
      // For download destination, use browser download
      if (options.destination === 'download') {
        return this.downloadSpecificationExport(specId, options);
      }
      
      // For other destinations, use API
      const response = await apiClient.post(`/api/specifications/${specId}/export`, {
        format: options.format,
        destination: options.destination,
        options: {
          includeImages: options.includeImages,
          includeCode: options.includeCode,
          includeDiagrams: options.includeDiagrams,
        },
      });
      
      return response;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
  
  /**
   * Download specification export as a file
   * @param specId - Specification ID
   * @param options - Export options
   * @returns Promise that resolves when download is complete
   */
  private async downloadSpecificationExport(
    specId: string,
    options: ExportOptions
  ): Promise<void> {
    try {
      // Get export data from API
      const response = await apiClient.post(
        `/api/specifications/${specId}/export/download`,
        {
          format: options.format,
          options: {
            includeImages: options.includeImages,
            includeCode: options.includeCode,
            includeDiagrams: options.includeDiagrams,
          },
        },
        {
          responseType: 'blob',
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on format
      const fileExtension = this.getFileExtension(options.format);
      link.setAttribute('download', `specification_export.${fileExtension}`);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }
  
  /**
   * Export tasks
   * @param taskSetId - Task set ID
   * @param options - Export options
   * @returns Promise that resolves when export is complete
   */
  async exportTasks(taskSetId: string, options: ExportOptions): Promise<void> {
    try {
      // For download destination, use browser download
      if (options.destination === 'download') {
        return this.downloadTasksExport(taskSetId, options);
      }
      
      // For other destinations, use API
      const response = await apiClient.post(`/api/tasks/${taskSetId}/export`, {
        format: options.format,
        destination: options.destination,
        options: {
          includeImages: options.includeImages,
          includeCode: options.includeCode,
          includeDiagrams: options.includeDiagrams,
        },
      });
      
      return response;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
  
  /**
   * Download tasks export as a file
   * @param taskSetId - Task set ID
   * @param options - Export options
   * @returns Promise that resolves when download is complete
   */
  private async downloadTasksExport(
    taskSetId: string,
    options: ExportOptions
  ): Promise<void> {
    try {
      // Get export data from API
      const response = await apiClient.post(
        `/api/tasks/${taskSetId}/export/download`,
        {
          format: options.format,
          options: {
            includeImages: options.includeImages,
            includeCode: options.includeCode,
            includeDiagrams: options.includeDiagrams,
          },
        },
        {
          responseType: 'blob',
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on format
      const fileExtension = this.getFileExtension(options.format);
      link.setAttribute('download', `tasks_export.${fileExtension}`);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }
  
  /**
   * Get connected services
   * @returns Promise that resolves to array of connected service IDs
   */
  async getConnectedServices(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/integrations/connected');
      return response;
    } catch (error) {
      console.error('Failed to get connected services:', error);
      return [];
    }
  }
}

// Create and export service instance
const exportService = new ExportService();
export default exportService;
