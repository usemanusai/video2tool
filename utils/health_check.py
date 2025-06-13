"""
Health check utilities for Video2Tool.
"""

import os
import logging
import asyncio
from typing import Dict, Any, List
from datetime import datetime
import httpx
import psutil

import config
from utils.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

class HealthChecker:
    """
    Comprehensive health checker for Video2Tool components.
    """
    
    def __init__(self):
        self.supabase_client = SupabaseClient()
    
    async def check_database_connection(self) -> Dict[str, Any]:
        """Check database connectivity."""
        try:
            if not self.supabase_client.client:
                return {
                    "status": "unhealthy",
                    "message": "Supabase client not initialized",
                    "details": "Check SUPABASE_URL and SUPABASE_KEY configuration"
                }
            
            # Try a simple query
            response = self.supabase_client.client.table("users").select("count", count="exact").execute()
            
            return {
                "status": "healthy",
                "message": "Database connection successful",
                "details": {
                    "user_count": response.count if hasattr(response, 'count') else 0,
                    "response_time_ms": "< 100"  # Placeholder
                }
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": f"Database connection failed: {str(e)}",
                "details": "Check database configuration and network connectivity"
            }
    
    async def check_ai_service(self) -> Dict[str, Any]:
        """Check AI service connectivity."""
        try:
            if not config.OPENROUTER_API_KEY:
                return {
                    "status": "unhealthy",
                    "message": "OpenRouter API key not configured",
                    "details": "Set OPENROUTER_API_KEY in environment variables"
                }
            
            # Test API connectivity
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://openrouter.ai/api/v1/models",
                    headers={"Authorization": f"Bearer {config.OPENROUTER_API_KEY}"}
                )
                
                if response.status_code == 200:
                    models = response.json()
                    return {
                        "status": "healthy",
                        "message": "AI service accessible",
                        "details": {
                            "available_models": len(models.get("data", [])),
                            "default_model": config.DEFAULT_MODEL
                        }
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "message": f"AI service returned status {response.status_code}",
                        "details": "Check API key validity"
                    }
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": f"AI service check failed: {str(e)}",
                "details": "Check network connectivity and API key"
            }
    
    def check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage."""
        try:
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Determine health status
            status = "healthy"
            warnings = []
            
            if cpu_percent > 80:
                warnings.append("High CPU usage")
                status = "warning"
            
            if memory.percent > 85:
                warnings.append("High memory usage")
                status = "warning"
            
            if disk.percent > 90:
                warnings.append("Low disk space")
                status = "warning"
            
            return {
                "status": status,
                "message": "System resources checked",
                "details": {
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory.percent,
                    "memory_available_gb": round(memory.available / (1024**3), 2),
                    "disk_percent": disk.percent,
                    "disk_free_gb": round(disk.free / (1024**3), 2),
                    "warnings": warnings
                }
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": f"System resource check failed: {str(e)}",
                "details": "Unable to retrieve system metrics"
            }
    
    def check_external_tools(self) -> Dict[str, Any]:
        """Check availability of external tools."""
        tools = {
            "ffmpeg": "Video processing",
            "tesseract": "OCR (optional)"
        }
        
        results = {}
        overall_status = "healthy"
        
        for tool, description in tools.items():
            try:
                import subprocess
                result = subprocess.run(
                    [tool, "-version"], 
                    capture_output=True, 
                    text=True, 
                    timeout=5
                )
                
                if result.returncode == 0:
                    # Extract version from output
                    version_line = result.stdout.split('\n')[0] if result.stdout else "Unknown version"
                    results[tool] = {
                        "status": "available",
                        "version": version_line,
                        "description": description
                    }
                else:
                    results[tool] = {
                        "status": "unavailable",
                        "error": "Command failed",
                        "description": description
                    }
                    if tool == "ffmpeg":  # FFmpeg is critical
                        overall_status = "unhealthy"
                    
            except FileNotFoundError:
                results[tool] = {
                    "status": "not_found",
                    "error": "Command not found in PATH",
                    "description": description
                }
                if tool == "ffmpeg":  # FFmpeg is critical
                    overall_status = "unhealthy"
            except Exception as e:
                results[tool] = {
                    "status": "error",
                    "error": str(e),
                    "description": description
                }
        
        return {
            "status": overall_status,
            "message": "External tools checked",
            "details": results
        }
    
    def check_directories(self) -> Dict[str, Any]:
        """Check required directories exist and are writable."""
        directories = {
            "temp": config.TEMP_DIR,
            "output": config.OUTPUT_DIR,
            "uploads": "uploads",
            "logs": "logs"
        }
        
        results = {}
        overall_status = "healthy"
        
        for name, path in directories.items():
            try:
                path_obj = config.Path(path)
                
                # Check if directory exists
                if not path_obj.exists():
                    path_obj.mkdir(parents=True, exist_ok=True)
                
                # Check if writable
                test_file = path_obj / ".write_test"
                test_file.write_text("test")
                test_file.unlink()
                
                results[name] = {
                    "status": "ok",
                    "path": str(path_obj.absolute()),
                    "writable": True
                }
                
            except Exception as e:
                results[name] = {
                    "status": "error",
                    "path": str(path),
                    "error": str(e),
                    "writable": False
                }
                overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "message": "Directory permissions checked",
            "details": results
        }
    
    async def run_comprehensive_health_check(self) -> Dict[str, Any]:
        """Run all health checks and return comprehensive status."""
        start_time = datetime.utcnow()
        
        # Run all checks
        checks = {
            "database": await self.check_database_connection(),
            "ai_service": await self.check_ai_service(),
            "system_resources": self.check_system_resources(),
            "external_tools": self.check_external_tools(),
            "directories": self.check_directories()
        }
        
        # Determine overall status
        statuses = [check["status"] for check in checks.values()]
        
        if "unhealthy" in statuses:
            overall_status = "unhealthy"
        elif "warning" in statuses:
            overall_status = "warning"
        else:
            overall_status = "healthy"
        
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()
        
        return {
            "status": overall_status,
            "timestamp": start_time.isoformat(),
            "duration_seconds": round(duration, 3),
            "checks": checks,
            "summary": {
                "total_checks": len(checks),
                "healthy": sum(1 for s in statuses if s == "healthy"),
                "warnings": sum(1 for s in statuses if s == "warning"),
                "unhealthy": sum(1 for s in statuses if s == "unhealthy")
            }
        }

# Global health checker instance
health_checker = HealthChecker()
