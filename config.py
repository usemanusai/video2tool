"""
Configuration module for the Video2Tool application.
Loads environment variables and provides configuration settings.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up logging for configuration warnings
logger = logging.getLogger(__name__)

def get_env_var(key: str, default=None, required: bool = False, var_type=str):
    """
    Get environment variable with validation and type conversion.

    Args:
        key: Environment variable name
        default: Default value if not found
        required: Whether the variable is required
        var_type: Type to convert the value to

    Returns:
        The environment variable value

    Raises:
        ValueError: If required variable is missing
    """
    value = os.getenv(key, default)

    if required and value is None:
        raise ValueError(f"Required environment variable {key} is not set")

    if value is None:
        return None

    if var_type == bool:
        return str(value).lower() in ("true", "1", "t", "yes", "on")
    elif var_type == int:
        try:
            return int(value)
        except ValueError:
            logger.warning(f"Invalid integer value for {key}: {value}, using default")
            return default
    elif var_type == float:
        try:
            return float(value)
        except ValueError:
            logger.warning(f"Invalid float value for {key}: {value}, using default")
            return default

    return value

# Base directories
BASE_DIR = Path(__file__).resolve().parent
TEMP_DIR = Path(os.getenv("TEMP_DIR", "./temp"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./output"))

# Ensure directories exist
TEMP_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# API Keys
OPENROUTER_API_KEY = get_env_var("OPENROUTER_API_KEY")

# Supabase Configuration
SUPABASE_URL = get_env_var("SUPABASE_URL")
SUPABASE_KEY = get_env_var("SUPABASE_KEY")
SUPABASE_JWT_SECRET = get_env_var("SUPABASE_JWT_SECRET")

# Integration API Keys (optional)
TRELLO_API_KEY = get_env_var("TRELLO_API_KEY")
TRELLO_API_TOKEN = get_env_var("TRELLO_API_TOKEN")
GITHUB_API_TOKEN = get_env_var("GITHUB_API_TOKEN")
CLICKUP_API_TOKEN = get_env_var("CLICKUP_API_TOKEN")

# AI Model Configuration
DEFAULT_MODEL = get_env_var("DEFAULT_MODEL", "anthropic/claude-3-opus-20240229")
FALLBACK_MODEL = get_env_var("FALLBACK_MODEL", "openai/gpt-4-turbo")

# Processing Settings
MAX_CHUNK_SIZE = get_env_var("MAX_CHUNK_SIZE", 4000, var_type=int)
MAX_TOKENS_PER_REQUEST = get_env_var("MAX_TOKENS_PER_REQUEST", 16000, var_type=int)
RATE_LIMIT_REQUESTS = get_env_var("RATE_LIMIT_REQUESTS", 10, var_type=int)
RATE_LIMIT_PERIOD = get_env_var("RATE_LIMIT_PERIOD", 60, var_type=int)  # seconds

# Supported video formats
SUPPORTED_VIDEO_FORMATS = [".mp4", ".avi", ".mov", ".mkv", ".webm"]

# Application Settings
DEBUG = get_env_var("DEBUG", False, var_type=bool)
LOG_LEVEL = get_env_var("LOG_LEVEL", "INFO")

# Web Server
HOST = get_env_var("HOST", "0.0.0.0")
PORT = get_env_var("PORT", 8000, var_type=int)

# Configuration validation
def validate_configuration():
    """Validate critical configuration and warn about missing values."""
    warnings = []

    if not OPENROUTER_API_KEY:
        warnings.append("OPENROUTER_API_KEY not set - AI features will not work")

    if not SUPABASE_URL or not SUPABASE_KEY:
        warnings.append("Supabase configuration incomplete - database features will not work")

    if warnings:
        logger.warning("Configuration warnings:")
        for warning in warnings:
            logger.warning(f"  - {warning}")
        logger.warning("Please check your .env file and add missing values")

# Run validation on import
validate_configuration()

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
