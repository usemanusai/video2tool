# Video2Tool

Video2Tool is an AI-powered application that processes videos, transcribes content, analyzes UI/UX, generates specifications, and creates development tasks.

## Features

- Video processing and analysis
- Transcription of video content
- UI/UX analysis
- Specification generation
- Task creation and management
- Integration with project management tools

## Installation

### Prerequisites

- Node.js 18+
- Python 3.10+
- FFmpeg
- 4GB RAM minimum

### Windows Installation

Run the PowerShell installation script:

```powershell
.\full_setup.ps1
```

### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/usemanusai/video2tool.git
cd video2tool
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

## Configuration

### API Keys and Secrets

Video2Tool requires several API keys and secrets to function properly. These should be stored in environment files and not committed to the repository.

1. Create a `.env` file in the `backend` directory using the template in `.env.example`:
```
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# OpenRouter.ai API
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

2. Create a configuration file by copying the example:
```bash
cp video2tool_config.example.json video2tool_config.json
```

3. Edit the `video2tool_config.json` file to add your API keys and secrets.

### Security Best Practices

- Never commit API keys, tokens, or secrets to the repository
- Use environment variables for sensitive information
- Keep your `.env` files and configuration files with secrets in `.gitignore`
- Regularly rotate your API keys and secrets

## Usage

### Starting the Application

Run the start script:

```bash
.\start_all.bat
```

Or start the components manually:

```bash
# Start the backend
cd backend
npm start

# Start the frontend
cd frontend
npm run dev
```

## License

[MIT License](LICENSE)
