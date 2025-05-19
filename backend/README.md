# Video2Tool Backend

Backend server for the Video2Tool application - AI-powered video analysis for software development.

## Features

- User authentication with Supabase
- Video URL processing and storage
- Video transcription and analysis
- UI/UX element detection
- Software specification generation
- Development task creation
- Export functionality (JSON, Markdown, PDF, HTML, Text)
- Project management integrations (Trello, GitHub, ClickUp)
- Optimized for low-resource environments (4GB RAM)

## Requirements

- Node.js 16+
- FFmpeg (for video processing)
- Supabase account (for authentication and database)
- OpenRouter.ai API key

## Installation

1. Clone the repository
2. Install dependencies:

```bash
cd backend
npm install
```

3. Create a `.env` file based on `.env.example` and fill in your API keys and configuration.

4. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Documentation

### Authentication

#### Register a new user

```
POST /api/auth/register
```

Request body:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "John Doe"
}
```

#### Login

```
POST /api/auth/login
```

Request body:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Get current user

```
GET /api/auth/me
```

Headers:
```
Authorization: Bearer <token>
```

### Video Processing

#### Upload a video file

```
POST /api/videos/upload
```

Form data:
- `video`: Video file
- `projectId`: (Optional) Project ID

#### Process a video URL

```
POST /api/videos/process-url
```

Request body:
```json
{
  "videoUrl": "https://example.com/video.mp4",
  "projectId": "optional-project-id"
}
```

#### Get task status

```
GET /api/videos/task/:taskId
```

#### Get video analysis

```
GET /api/videos/analysis/:id
```

Headers:
```
Authorization: Bearer <token>
```

### Specifications

#### Generate a specification

```
POST /api/specifications/generate
```

Request body:
```json
{
  "videoTaskId": "task-id-from-video-processing",
  "title": "Software Specification",
  "description": "Optional description"
}
```

#### Get a specification

```
GET /api/specifications/:id
```

Headers:
```
Authorization: Bearer <token>
```

#### Get specifications for a project

```
GET /api/specifications/project/:projectId
```

Headers:
```
Authorization: Bearer <token>
```

### Tasks

#### Create tasks from a specification

```
POST /api/tasks/create
```

Request body:
```json
{
  "specTaskId": "task-id-from-specification-generation"
}
```

#### Get tasks

```
GET /api/tasks/:id
```

Headers:
```
Authorization: Bearer <token>
```

#### Get tasks for a specification

```
GET /api/tasks/specification/:specificationId
```

Headers:
```
Authorization: Bearer <token>
```

#### Update a task

```
PUT /api/tasks/:id
```

Headers:
```
Authorization: Bearer <token>
```

Request body:
```json
{
  "status": "in_progress",
  "completedAt": "2023-05-20T15:30:00Z"
}
```

### Export

#### Export a specification

```
POST /api/export/specification/:id
```

Headers:
```
Authorization: Bearer <token>
```

Request body:
```json
{
  "format": "json",
  "includeVisualElements": true,
  "includeTranscription": true
}
```

#### Export tasks

```
POST /api/export/tasks/:id
```

Headers:
```
Authorization: Bearer <token>
```

Request body:
```json
{
  "format": "json"
}
```

#### Export complete analysis

```
POST /api/export/complete/:specId/:tasksId
```

Headers:
```
Authorization: Bearer <token>
```

Request body:
```json
{
  "format": "json"
}
```

### Integrations

#### Get available integration types

```
GET /api/integrations/types
```

#### Get initialized integrations

```
GET /api/integrations/initialized
```

#### Authenticate with an integration

```
POST /api/integrations/auth
```

Request body:
```json
{
  "integrationType": "trello",
  "apiKey": "your-api-key",
  "apiToken": "your-api-token"
}
```

#### Export tasks to an integration

```
POST /api/integrations/export/:integrationType
```

Headers:
```
Authorization: Bearer <token>
```

Request body:
```json
{
  "tasksId": "tasks-id",
  "projectName": "My Project",
  "boardName": "Development Tasks"
}
```

## Memory Optimization

The backend is optimized for low-resource environments (4GB RAM):

- Queue concurrency is limited to 1 by default
- Node.js memory limit is set to 2GB
- Video processing is done in chunks
- Temporary files are cleaned up after processing
- Database queries are optimized

## License

MIT
