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

- **Node.js** (v16+) - [Download](https://nodejs.org/)
- **Python** 3.9+ - [Download](https://python.org/downloads/)
- **FFmpeg** - [Installation Guide](INSTALLATION_GUIDE.md#3-ffmpeg-required-for-video-processing)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/usemanusai/video2tool.git
   cd video2tool
   ```

2. **Run the automated setup:**
   ```bash
   # This will check dependencies and set up the environment
   python setup_environment.py
   ```

3. **Configure your environment:**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your API keys (see Configuration section below)
   ```

4. **Set up the database:**
   - Create a [Supabase](https://supabase.com/) account and project
   - Run the SQL script in `database_setup.sql` in your Supabase SQL editor
   - Add your Supabase credentials to `.env`

5. **Start the application:**
   ```bash
   # Option 1: Use the comprehensive startup script (recommended)
   python start_video2tool.py

   # Option 2: Use the batch script (Windows only)
   .\start_all.bat

   # Option 3: Start services manually
   # Terminal 1: Python API
   python main.py

   # Terminal 2: Node.js Backend
   cd backend && npm start

   # Terminal 3: Frontend
   cd frontend && npm run dev
   ```

6. **Access the application:**
   - **Frontend:** http://localhost:3000
   - **Python API:** http://localhost:8000
   - **API Documentation:** http://localhost:8000/docs

### Configuration

#### Required API Keys

1. **OpenRouter API Key** (Required for AI features)
   - Sign up at [OpenRouter](https://openrouter.ai/)
   - Add to `.env`: `OPENROUTER_API_KEY=your_key_here`

2. **Supabase Configuration** (Required for database)
   - Create account at [Supabase](https://supabase.com/)
   - Add to `.env`:
     ```
     SUPABASE_URL=your_project_url
     SUPABASE_KEY=your_anon_key
     SUPABASE_JWT_SECRET=your_jwt_secret
     ```

#### Optional Integrations

- **Trello:** Get API key from [Trello Developer](https://trello.com/app-key)
- **GitHub:** Create token at [GitHub Settings](https://github.com/settings/tokens)
- **ClickUp:** Get token from [ClickUp Apps](https://app.clickup.com/settings/apps)

### Troubleshooting

If you encounter issues, see the detailed [Installation Guide](INSTALLATION_GUIDE.md) for:
- Platform-specific installation instructions
- Common error solutions
- Performance optimization tips
- Dependency troubleshooting

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