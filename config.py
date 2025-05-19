"""
Configuration module for the Video2Tool application.
Loads environment variables and provides configuration settings.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directories
BASE_DIR = Path(__file__).resolve().parent
TEMP_DIR = Path(os.getenv("TEMP_DIR", "./temp"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./output"))

# Ensure directories exist
TEMP_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# API Keys
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Integration API Keys
TRELLO_API_KEY = os.getenv("TRELLO_API_KEY")
TRELLO_API_TOKEN = os.getenv("TRELLO_API_TOKEN")
GITHUB_API_TOKEN = os.getenv("GITHUB_API_TOKEN")
CLICKUP_API_TOKEN = os.getenv("CLICKUP_API_TOKEN")

# AI Model Configuration
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "anthropic/claude-3-opus-20240229")
FALLBACK_MODEL = os.getenv("FALLBACK_MODEL", "openai/gpt-4-turbo")

# Processing Settings
MAX_CHUNK_SIZE = int(os.getenv("MAX_CHUNK_SIZE", 4000))
MAX_TOKENS_PER_REQUEST = int(os.getenv("MAX_TOKENS_PER_REQUEST", 16000))
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", 10))
RATE_LIMIT_PERIOD = int(os.getenv("RATE_LIMIT_PERIOD", 60))  # seconds

# Supported video formats
SUPPORTED_VIDEO_FORMATS = [".mp4", ".avi", ".mov", ".mkv", ".webm"]

# Application Settings
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Web Server
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# Prompt templates
SYSTEM_PROMPT_TEMPLATE = """
You are an expert software development assistant that analyzes video content
and extracts detailed software specifications. Your task is to {task_type}.
"""

# Video analysis prompt
VIDEO_ANALYSIS_PROMPT = """
Analyze the provided video transcription and visual elements to create a comprehensive
summary of the software shown. Focus on:
1. User interface components and their functionality
2. User workflows and interactions
3. Data structures and relationships
4. System architecture and components
5. Key features and capabilities
"""

# Specification generation prompt
SPEC_GENERATION_PROMPT = """
Based on the video analysis, create a detailed software specification document that includes:
1. Overview and purpose
2. Functional requirements
3. Non-functional requirements
4. User stories
5. Data models
6. API endpoints (if applicable)
7. UI/UX specifications
8. Technical constraints and considerations
"""

# Task generation prompt
TASK_GENERATION_PROMPT = """
Convert the software specification into a structured development plan with:
1. A breakdown of actionable tasks
2. Dependencies between tasks
3. Priority levels (Critical, High, Medium, Low)
4. Time estimates for each task
5. Suggested implementation approach
6. Potential challenges and mitigations
"""
