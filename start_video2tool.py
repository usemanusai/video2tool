#!/usr/bin/env python3
"""
Comprehensive startup script for Video2Tool.
Checks dependencies, configuration, and starts all services.
"""

import os
import sys
import time
import signal
import subprocess
import threading
from pathlib import Path
from typing import List, Optional

def check_dependencies() -> bool:
    """Check if all required dependencies are available."""
    print("🔍 Checking dependencies...")
    
    # Check Python packages
    required_packages = ["fastapi", "uvicorn", "supabase"]
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing Python packages: {', '.join(missing_packages)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    # Check Node.js dependencies
    if not Path("backend/node_modules").exists():
        print("❌ Backend Node.js dependencies not installed")
        print("Run: cd backend && npm install")
        return False
    
    if not Path("frontend/node_modules").exists():
        print("❌ Frontend Node.js dependencies not installed")
        print("Run: cd frontend && npm install")
        return False
    
    print("✅ All dependencies are available")
    return True

def check_configuration() -> bool:
    """Check if configuration is properly set up."""
    print("⚙️  Checking configuration...")
    
    # Check if .env file exists
    if not Path(".env").exists():
        print("❌ .env file not found")
        print("Copy .env.example to .env and configure your settings")
        return False
    
    # Load and check critical environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    critical_vars = {
        "OPENROUTER_API_KEY": "AI features",
        "SUPABASE_URL": "Database",
        "SUPABASE_KEY": "Database authentication"
    }
    
    missing_vars = []
    for var, purpose in critical_vars.items():
        if not os.getenv(var):
            missing_vars.append(f"{var} (for {purpose})")
    
    if missing_vars:
        print("⚠️  Missing critical configuration:")
        for var in missing_vars:
            print(f"   - {var}")
        print("The application will start but some features may not work")
    else:
        print("✅ Configuration looks good")
    
    return True

def check_external_tools() -> bool:
    """Check if external tools are available."""
    print("🛠️  Checking external tools...")
    
    tools = {
        "ffmpeg": "Video processing",
        "node": "Backend server",
        "npm": "Package management"
    }
    
    missing_tools = []
    for tool, purpose in tools.items():
        if not subprocess.run(["which", tool], capture_output=True).returncode == 0:
            if subprocess.run(["where", tool], capture_output=True, shell=True).returncode != 0:
                missing_tools.append(f"{tool} (for {purpose})")
    
    if missing_tools:
        print("❌ Missing external tools:")
        for tool in missing_tools:
            print(f"   - {tool}")
        return False
    
    print("✅ External tools are available")
    return True

def create_directories():
    """Create required directories."""
    directories = ["temp", "output", "uploads", "logs"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)

class ServiceManager:
    """Manages the lifecycle of all Video2Tool services."""
    
    def __init__(self):
        self.processes = {}
        self.running = False
    
    def start_service(self, name: str, command: List[str], cwd: Optional[str] = None) -> bool:
        """Start a service and track its process."""
        try:
            print(f"🚀 Starting {name}...")
            
            # Create log files
            log_dir = Path("logs")
            log_dir.mkdir(exist_ok=True)
            
            stdout_log = open(log_dir / f"{name}_stdout.log", "w")
            stderr_log = open(log_dir / f"{name}_stderr.log", "w")
            
            process = subprocess.Popen(
                command,
                cwd=cwd,
                stdout=stdout_log,
                stderr=stderr_log,
                text=True
            )
            
            self.processes[name] = {
                "process": process,
                "stdout_log": stdout_log,
                "stderr_log": stderr_log
            }
            
            # Give the service a moment to start
            time.sleep(2)
            
            # Check if it's still running
            if process.poll() is None:
                print(f"✅ {name} started successfully (PID: {process.pid})")
                return True
            else:
                print(f"❌ {name} failed to start")
                return False
                
        except Exception as e:
            print(f"❌ Failed to start {name}: {e}")
            return False
    
    def stop_all_services(self):
        """Stop all running services."""
        print("\n🛑 Stopping all services...")
        
        for name, service_info in self.processes.items():
            process = service_info["process"]
            if process.poll() is None:  # Still running
                print(f"Stopping {name}...")
                process.terminate()
                
                # Wait for graceful shutdown
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    print(f"Force killing {name}...")
                    process.kill()
            
            # Close log files
            service_info["stdout_log"].close()
            service_info["stderr_log"].close()
        
        self.processes.clear()
        self.running = False
        print("✅ All services stopped")
    
    def start_all_services(self) -> bool:
        """Start all Video2Tool services."""
        self.running = True
        
        # Start Python API
        if not self.start_service(
            "python-api",
            [sys.executable, "main.py"],
            cwd="."
        ):
            return False
        
        # Start Node.js backend
        if not self.start_service(
            "nodejs-backend",
            ["npm", "start"],
            cwd="backend"
        ):
            return False
        
        # Start frontend (development mode)
        if not self.start_service(
            "frontend",
            ["npm", "run", "dev"],
            cwd="frontend"
        ):
            return False
        
        return True
    
    def monitor_services(self):
        """Monitor services and restart if they crash."""
        while self.running:
            for name, service_info in list(self.processes.items()):
                process = service_info["process"]
                if process.poll() is not None:  # Process has terminated
                    print(f"⚠️  {name} has stopped unexpectedly")
                    # Could implement restart logic here
            
            time.sleep(5)

def signal_handler(signum, frame):
    """Handle shutdown signals."""
    print("\n🔄 Received shutdown signal...")
    if 'service_manager' in globals():
        service_manager.stop_all_services()
    sys.exit(0)

def main():
    """Main function to start Video2Tool."""
    print("🎬 Video2Tool Startup")
    print("=" * 50)
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Pre-flight checks
    if not check_dependencies():
        print("\n❌ Dependency check failed. Please install missing dependencies.")
        return False
    
    if not check_configuration():
        print("\n❌ Configuration check failed. Please fix configuration issues.")
        return False
    
    if not check_external_tools():
        print("\n❌ External tools check failed. Please install missing tools.")
        return False
    
    # Create required directories
    create_directories()
    
    # Start services
    global service_manager
    service_manager = ServiceManager()
    
    print("\n🚀 Starting Video2Tool services...")
    
    if not service_manager.start_all_services():
        print("\n❌ Failed to start all services")
        service_manager.stop_all_services()
        return False
    
    print("\n🎉 Video2Tool is running!")
    print("\n📍 Access points:")
    print("   Frontend:  http://localhost:3000")
    print("   Python API: http://localhost:8000")
    print("   API Docs:   http://localhost:8000/docs")
    print("\n📝 Logs are available in the 'logs/' directory")
    print("\n⏹️  Press Ctrl+C to stop all services")
    
    # Start monitoring in a separate thread
    monitor_thread = threading.Thread(target=service_manager.monitor_services, daemon=True)
    monitor_thread.start()
    
    # Keep the main thread alive
    try:
        while service_manager.running:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    
    service_manager.stop_all_services()
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        if 'service_manager' in globals():
            service_manager.stop_all_services()
        sys.exit(1)
