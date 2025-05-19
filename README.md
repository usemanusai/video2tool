# Video2Tool

Video2Tool is an AI-powered application that transforms videos into software development specifications and tasks. It analyzes UI/UX elements in videos, generates detailed specifications, and creates actionable development tasks.

## Features

- **Video Analysis**: Upload videos or provide URLs for detailed analysis of UI/UX elements and workflows
- **Specification Generation**: Automatically generate detailed software specifications from video content
- **Task Creation**: Convert specifications into actionable development tasks with dependencies
- **Project Management Integration**: Export tasks to popular project management tools
- **Real-time Collaboration**: Work together with team members in real-time

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python 3.9+
- FFmpeg

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/usemanusai/video2tool.git
   cd video2tool
   ```

2. Run the setup script:
   ```
   # On Windows
   .\full_setup.ps1
   ```

3. Start the application:
   ```
   # On Windows
   .\start_all.bat
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Development

The project consists of:

- **Frontend**: React/TypeScript application with Material-UI
- **Backend**: Node.js/Express.js server with Socket.IO for real-time features
- **API**: FastAPI Python backend for video processing and AI analysis

## Recent Updates

- Fixed frontend and backend connectivity issues
- Implemented automatic port management for both servers
- Added Socket.IO for real-time collaboration
- Improved error handling and logging

## License

This project is open source and available under the MIT License.