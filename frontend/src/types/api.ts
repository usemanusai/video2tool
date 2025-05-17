// Common types
export type UUID = string;
export type ISO8601Date = string;

// User types
export interface User {
  id: UUID;
  email: string;
  full_name?: string;
  created_at: ISO8601Date;
  last_sign_in?: ISO8601Date;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

// Project types
export interface Project {
  id: UUID;
  name: string;
  description?: string;
  user_id: UUID;
  created_at: ISO8601Date;
  updated_at: ISO8601Date;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

// Video analysis types
export interface VideoAnalysis {
  id: UUID;
  project_id: UUID;
  video_name: string;
  video_url?: string;
  video_file_path?: string;
  created_at: ISO8601Date;
  status: string;
  transcription?: string;
  visual_elements?: any;
  summary?: any;
  metadata?: any;
  screen_flow?: any;
  heatmap?: any;
}

export interface VideoAnalysisCreate {
  project_id: UUID;
  video_name: string;
  video_url?: string;
  video_file_path?: string;
}

// Specification types
export interface Specification {
  id: UUID;
  video_analysis_id: UUID;
  title: string;
  description?: string;
  created_at: ISO8601Date;
  status: string;
  content?: any;
}

export interface SpecificationCreate {
  video_analysis_id: UUID;
  title: string;
  description?: string;
}

// Task types
export interface Task {
  id: UUID;
  specification_id: UUID;
  name: string;
  description?: string;
  category?: string;
  priority?: string;
  estimate?: string;
  created_at: ISO8601Date;
  dependencies?: UUID[];
  notes?: string;
}

export interface TaskCreate {
  specification_id: UUID;
  name: string;
  description?: string;
  category?: string;
  priority?: string;
  estimate?: string;
  dependencies?: UUID[];
}

// Processing task types
export interface ProcessingTask {
  task_id: string;
  message: string;
  video_analysis_id?: UUID;
}

export interface TaskStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: number;
  started_at?: number;
  completed_at?: number;
  result?: any;
  error?: string;
}

// Export types
export enum ExportFormat {
  JSON = 'json',
  MARKDOWN = 'markdown',
  TEXT = 'text',
  PDF = 'pdf'
}

export interface ExportRequest {
  format: ExportFormat;
  filename?: string;
  include_metadata: boolean;
}

// Integration types
export enum IntegrationType {
  TRELLO = 'trello',
  GITHUB = 'github',
  CLICKUP = 'clickup'
}

export interface IntegrationAuthRequest {
  integration_type: IntegrationType;
  api_key?: string;
  api_token?: string;
}

export interface CreateProjectRequest {
  integration_type: IntegrationType;
  name: string;
  description?: string;
}

export interface CreateTaskRequest {
  integration_type: IntegrationType;
  project_id: string;
  name: string;
  description?: string;
  additional_params?: any;
}

export interface CreateTasksRequest {
  integration_type: IntegrationType;
  project_id: string;
  tasks: any[];
}
