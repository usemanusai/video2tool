# Video2Tool Installation Guide

This guide will help you install and configure Video2Tool with all required dependencies.

## Prerequisites

### System Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: Minimum 8GB, Recommended 16GB+
- **Storage**: At least 5GB free space
- **Internet**: Required for AI services and package downloads

### Required Software

#### 1. Python 3.9+
**Windows:**
```bash
# Download from https://python.org/downloads/
# Or use winget
winget install Python.Python.3.11
```

**macOS:**
```bash
# Using Homebrew
brew install python@3.11
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3.11 python3.11-pip python3.11-venv
```

#### 2. Node.js 16+
**Windows:**
```bash
# Download from https://nodejs.org/
# Or use winget
winget install OpenJS.NodeJS
```

**macOS:**
```bash
# Using Homebrew
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3. FFmpeg (Required for video processing)
**Windows:**
```bash
# Using winget
winget install Gyan.FFmpeg

# Or download from https://ffmpeg.org/download.html
# Add to PATH manually
```

**macOS:**
```bash
# Using Homebrew
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

#### 4. Tesseract OCR (Optional, for text extraction)
**Windows:**
```bash
# Download installer from https://github.com/UB-Mannheim/tesseract/wiki
# Or use winget
winget install UB-Mannheim.TesseractOCR
```

**macOS:**
```bash
# Using Homebrew
brew install tesseract
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-eng
```

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/usemanusai/video2tool.git
cd video2tool
```

### 2. Run the Setup Script
```bash
# This will check dependencies and set up the environment
python setup_environment.py
```

### 3. Manual Setup (if setup script fails)

#### Install Python Dependencies
```bash
# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Install Node.js Dependencies
```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 4. Environment Configuration

#### Create .env file
```bash
# Copy the example file
cp .env.example .env

# Edit .env file with your configuration
# Use your preferred text editor
```

#### Required API Keys

1. **OpenRouter API Key** (Required for AI features)
   - Sign up at https://openrouter.ai/
   - Get your API key from the dashboard
   - Add to .env: `OPENROUTER_API_KEY=your_key_here`

2. **Supabase Configuration** (Required for database)
   - Create account at https://supabase.com/
   - Create a new project
   - Get URL, anon key, and JWT secret from project settings
   - Add to .env:
     ```
     SUPABASE_URL=your_project_url
     SUPABASE_KEY=your_anon_key
     SUPABASE_JWT_SECRET=your_jwt_secret
     ```

3. **Optional Integration API Keys**
   - **Trello**: Get from https://trello.com/app-key
   - **GitHub**: Create token at https://github.com/settings/tokens
   - **ClickUp**: Get from https://app.clickup.com/settings/apps

### 5. Database Setup

#### Set up Supabase Database
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database_setup.sql`
4. Run the SQL script
5. Verify tables are created in the Table Editor

### 6. Verify Installation

#### Test Python API
```bash
python main.py
```
Should start the FastAPI server on http://localhost:8000

#### Test Node.js Backend
```bash
cd backend
npm start
```
Should start the backend server

#### Test Frontend
```bash
cd frontend
npm run dev
```
Should start the development server on http://localhost:3000

## Troubleshooting

### Common Issues

#### 1. FFmpeg not found
**Error**: `FFmpeg not found in PATH`
**Solution**: 
- Ensure FFmpeg is installed and added to system PATH
- Restart terminal/command prompt after installation
- Test with: `ffmpeg -version`

#### 2. Python package installation fails
**Error**: Various pip installation errors
**Solution**:
```bash
# Update pip
python -m pip install --upgrade pip

# Install with verbose output to see errors
pip install -r requirements.txt -v

# For Windows, you might need Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

#### 3. Node.js memory issues
**Error**: `JavaScript heap out of memory`
**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or on Windows:
set NODE_OPTIONS=--max-old-space-size=4096
```

#### 4. Supabase connection issues
**Error**: Database connection failures
**Solution**:
- Verify Supabase URL and keys in .env
- Check if Supabase project is active
- Ensure database schema is set up correctly

#### 5. Port conflicts
**Error**: `Port already in use`
**Solution**:
```bash
# Find and kill processes using the ports
# Windows:
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

### Performance Optimization

#### For Low-Memory Systems
1. Reduce worker processes in .env:
   ```
   BACKEND_WORKERS=1
   PYTHON_MEMORY_OPTIMIZATION=true
   ```

2. Use smaller AI models:
   ```
   DEFAULT_MODEL=openai/gpt-3.5-turbo
   ```

#### For Better Performance
1. Use SSD storage for temp directories
2. Increase system RAM if possible
3. Use faster internet connection for AI API calls

## Next Steps

After successful installation:

1. **Start all services**:
   ```bash
   # Method 1: Use the provided script
   # Windows:
   .\start_all.bat
   
   # Method 2: Start manually
   # Terminal 1: Python API
   python main.py
   
   # Terminal 2: Node.js Backend
   cd backend && npm start
   
   # Terminal 3: Frontend
   cd frontend && npm run dev
   ```

2. **Access the application**:
   - Frontend: http://localhost:3000
   - Python API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

3. **Upload your first video** and test the analysis pipeline

## Support

If you encounter issues not covered in this guide:

1. Check the application logs in the `logs/` directory
2. Verify all environment variables are set correctly
3. Ensure all required services are running
4. Check the GitHub repository for known issues

For additional help, please create an issue on the GitHub repository with:
- Your operating system and version
- Error messages and logs
- Steps to reproduce the issue
