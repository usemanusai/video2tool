#!/usr/bin/env python3
"""
Environment setup script for Video2Tool.
This script helps configure the environment and check dependencies.
"""

import os
import sys
import subprocess
import shutil
import secrets
from pathlib import Path
from typing import Dict, List, Tuple

def check_command_exists(command: str) -> bool:
    """Check if a command exists in the system PATH."""
    return shutil.which(command) is not None

def run_command(command: List[str], capture_output: bool = True) -> Tuple[bool, str]:
    """Run a command and return success status and output."""
    try:
        result = subprocess.run(
            command, 
            capture_output=capture_output, 
            text=True, 
            check=True
        )
        return True, result.stdout if capture_output else ""
    except subprocess.CalledProcessError as e:
        return False, e.stderr if capture_output else str(e)
    except FileNotFoundError:
        return False, f"Command not found: {command[0]}"

def check_python_dependencies() -> Dict[str, bool]:
    """Check if required Python packages are installed."""
    required_packages = [
        "fastapi", "uvicorn", "python-dotenv", "pydantic", "httpx",
        "supabase", "python-jose", "passlib", "moviepy", "opencv-python",
        "whisper", "pytesseract", "pillow", "scikit-learn", "pytube",
        "yt-dlp", "openai", "tiktoken", "networkx", "jinja2", "aiofiles",
        "pytest", "python-multipart", "tqdm", "markdown", "weasyprint", "pyyaml"
    ]
    
    results = {}
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            results[package] = True
        except ImportError:
            results[package] = False
    
    return results

def check_node_dependencies() -> bool:
    """Check if Node.js dependencies are installed."""
    backend_node_modules = Path("backend/node_modules")
    frontend_node_modules = Path("frontend/node_modules")
    
    return backend_node_modules.exists() and frontend_node_modules.exists()

def create_env_file() -> bool:
    """Create .env file from template if it doesn't exist."""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if env_file.exists():
        print("✓ .env file already exists")
        return True
    
    if not env_example.exists():
        print("✗ .env.example template not found")
        return False
    
    # Copy template and generate secure secrets
    with open(env_example, 'r') as f:
        content = f.read()
    
    # Generate secure secrets
    jwt_secret = secrets.token_urlsafe(32)
    supabase_jwt_secret = secrets.token_urlsafe(32)
    
    # Replace placeholder values
    content = content.replace("your_jwt_secret_key_here", jwt_secret)
    content = content.replace("your_supabase_jwt_secret_here", supabase_jwt_secret)
    
    with open(env_file, 'w') as f:
        f.write(content)
    
    print("✓ Created .env file from template")
    print("⚠️  Please edit .env file and add your API keys")
    return True

def create_directories() -> bool:
    """Create required directories."""
    directories = [
        "temp", "output", "uploads", "logs",
        "backend/uploads", "backend/temp", "backend/logs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    print("✓ Created required directories")
    return True

def check_external_dependencies() -> Dict[str, bool]:
    """Check for external system dependencies."""
    dependencies = {
        "ffmpeg": check_command_exists("ffmpeg"),
        "tesseract": check_command_exists("tesseract"),
        "node": check_command_exists("node"),
        "npm": check_command_exists("npm"),
        "python": check_command_exists("python") or check_command_exists("python3"),
        "pip": check_command_exists("pip") or check_command_exists("pip3")
    }
    
    return dependencies

def main():
    """Main setup function."""
    print("🚀 Video2Tool Environment Setup")
    print("=" * 50)
    
    # Check external dependencies
    print("\n📋 Checking external dependencies...")
    external_deps = check_external_dependencies()
    
    for dep, available in external_deps.items():
        status = "✓" if available else "✗"
        print(f"{status} {dep}")
    
    missing_critical = []
    if not external_deps.get("python"):
        missing_critical.append("Python 3.9+")
    if not external_deps.get("node"):
        missing_critical.append("Node.js 16+")
    if not external_deps.get("npm"):
        missing_critical.append("npm")
    
    if missing_critical:
        print(f"\n❌ Critical dependencies missing: {', '.join(missing_critical)}")
        print("Please install these before continuing.")
        return False
    
    # Create directories
    print("\n📁 Creating directories...")
    create_directories()
    
    # Create .env file
    print("\n⚙️  Setting up environment configuration...")
    create_env_file()
    
    # Check Python dependencies
    print("\n🐍 Checking Python dependencies...")
    python_deps = check_python_dependencies()
    installed = sum(1 for available in python_deps.values() if available)
    total = len(python_deps)
    
    print(f"Python packages: {installed}/{total} installed")
    
    if installed < total:
        print("\n📦 Installing Python dependencies...")
        success, output = run_command([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        if success:
            print("✓ Python dependencies installed")
        else:
            print(f"✗ Failed to install Python dependencies: {output}")
    
    # Check Node.js dependencies
    print("\n📦 Checking Node.js dependencies...")
    if not check_node_dependencies():
        print("Installing Node.js dependencies...")
        
        # Install backend dependencies
        print("Installing backend dependencies...")
        success, output = run_command(["npm", "install"], capture_output=False)
        if not success:
            print(f"✗ Failed to install backend dependencies: {output}")
            return False
        
        # Install frontend dependencies
        print("Installing frontend dependencies...")
        os.chdir("frontend")
        success, output = run_command(["npm", "install"], capture_output=False)
        os.chdir("..")
        if not success:
            print(f"✗ Failed to install frontend dependencies: {output}")
            return False
        
        print("✓ Node.js dependencies installed")
    else:
        print("✓ Node.js dependencies already installed")
    
    # Final recommendations
    print("\n🎉 Setup complete!")
    print("\n📝 Next steps:")
    print("1. Edit .env file and add your API keys")
    print("2. Set up Supabase database (see README for schema)")
    print("3. Install FFmpeg for video processing")
    print("4. Run: python main.py (for Python API)")
    print("5. Run: cd backend && npm start (for Node.js backend)")
    print("6. Run: cd frontend && npm run dev (for frontend)")
    
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)
