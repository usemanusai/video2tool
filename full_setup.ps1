<#
.SYNOPSIS
    Installation and management script for Video2Tool project.

.DESCRIPTION
    This script provides a comprehensive setup and management system for the Video2Tool project.
    It handles installation of prerequisites, repository cloning, environment configuration,
    and provides an interactive menu for various operations.

.NOTES
    File Name      : full_setup.ps1
    Author         : Video2Tool Team
    Prerequisite   : PowerShell 5.1 or later
    Copyright      : MIT License
#>

#Requires -Version 5.1

# Script configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue" # Speeds up downloads

# Constants
$REPO_URL = "https://github.com/yourusername/video2tool.git"
$PROJECT_DIR = Join-Path $PSScriptRoot "video2tool"
$CONFIG_FILE = Join-Path $PSScriptRoot "video2tool_config.json"
$LOG_FILE = Join-Path $PSScriptRoot "video2tool_install.log"
$NODE_VERSION = "16.20.0"
$PYTHON_VERSION = "3.10.11"
$GIT_VERSION = "2.40.0"

# Initialize logging
function Write-Log {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [Parameter(Mandatory=$false)]
        [ValidateSet("INFO", "WARNING", "ERROR")]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    # Write to console with color based on level
    switch ($Level) {
        "INFO" { Write-Host $logMessage -ForegroundColor Cyan }
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
    }

    # Append to log file
    Add-Content -Path $LOG_FILE -Value $logMessage
}

# Create log file if it doesn't exist
if (-not (Test-Path $LOG_FILE)) {
    New-Item -Path $LOG_FILE -ItemType File -Force | Out-Null
}

Write-Log "Starting Video2Tool installation script"

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to load configuration
function Load-Configuration {
    if (Test-Path $CONFIG_FILE) {
        try {
            $config = Get-Content -Path $CONFIG_FILE -Raw | ConvertFrom-Json
            Write-Log "Configuration loaded from $CONFIG_FILE"
            return $config
        }
        catch {
            Write-Log "Error loading configuration: $_" -Level "ERROR"
            return $null
        }
    }
    else {
        Write-Log "No configuration file found, creating default configuration"
        $config = @{
            BackendConfig = @{
                DatabaseUrl = "sqlite:///./app.db"
                SecretKey = [System.Guid]::NewGuid().ToString()
                Algorithm = "HS256"
                AccessTokenExpireMinutes = 30
                OpenRouterApiKey = ""
                OpenRouterBaseUrl = "https://openrouter.ai/api/v1"
                SupabaseUrl = ""
                SupabaseKey = ""
                UploadDir = "./uploads"
            }
            FrontendConfig = @{
                ApiUrl = "http://localhost:8000"
                SocketUrl = "http://localhost:8000"
                AnalyticsId = ""
            }
            MemoryOptimization = @{
                BackendWorkers = 1
                NodeMemoryLimit = 2048
                PythonMemoryOptimization = $true
            }
            InstallPath = $PROJECT_DIR
        }

        Save-Configuration $config
        return $config
    }
}

# Function to save configuration
function Save-Configuration {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    try {
        $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $CONFIG_FILE
        Write-Log "Configuration saved to $CONFIG_FILE"
    }
    catch {
        Write-Log "Error saving configuration: $_" -Level "ERROR"
    }
}

# Function to check if a command exists
function Test-Command {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Command
    )

    return [bool](Get-Command -Name $Command -ErrorAction SilentlyContinue)
}

# Function to check prerequisites
function Test-Prerequisites {
    $prerequisites = @{
        "Node.js" = @{
            Command = "node"
            InstallFunction = "Install-Node"
            VersionArg = "-v"
            Required = $true
        }
        "Python" = @{
            Command = "python"
            InstallFunction = "Install-Python"
            VersionArg = "--version"
            Required = $true
        }
        "Git" = @{
            Command = "git"
            InstallFunction = "Install-Git"
            VersionArg = "--version"
            Required = $true
        }
        "pip" = @{
            Command = "pip"
            InstallFunction = $null
            VersionArg = "--version"
            Required = $true
        }
        "npm" = @{
            Command = "npm"
            InstallFunction = $null
            VersionArg = "--version"
            Required = $true
        }
    }

    $missingPrerequisites = @()

    foreach ($prereq in $prerequisites.Keys) {
        $info = $prerequisites[$prereq]

        if (Test-Command -Command $info.Command) {
            try {
                $versionOutput = & $info.Command $info.VersionArg 2>&1
                Write-Log "$prereq is installed: $versionOutput"
            }
            catch {
                Write-Log "Error checking $prereq version: $_" -Level "WARNING"
            }
        }
        else {
            Write-Log "$prereq is not installed" -Level "WARNING"
            if ($info.Required) {
                $missingPrerequisites += $prereq
            }
        }
    }

    return $missingPrerequisites
}

# Function to install Node.js
function Install-Node {
    Write-Log "Installing Node.js $NODE_VERSION..."

    $tempDir = Join-Path $env:TEMP "video2tool_install"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    $nodeInstallerUrl = "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-x64.msi"
    $nodeInstallerPath = Join-Path $tempDir "node-installer.msi"

    try {
        # Download Node.js installer
        Write-Log "Downloading Node.js installer from $nodeInstallerUrl"
        Invoke-WebRequest -Uri $nodeInstallerUrl -OutFile $nodeInstallerPath

        # Install Node.js
        Write-Log "Running Node.js installer"
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $nodeInstallerPath, "/quiet", "/norestart" -Wait

        # Verify installation
        if (Test-Command -Command "node") {
            $nodeVersion = & node -v
            Write-Log "Node.js $nodeVersion installed successfully"
            return $true
        }
        else {
            Write-Log "Node.js installation failed" -Level "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Error installing Node.js: $_" -Level "ERROR"
        return $false
    }
    finally {
        # Clean up
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Function to install Python
function Install-Python {
    Write-Log "Installing Python $PYTHON_VERSION..."

    $tempDir = Join-Path $env:TEMP "video2tool_install"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    $pythonInstallerUrl = "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-amd64.exe"
    $pythonInstallerPath = Join-Path $tempDir "python-installer.exe"

    try {
        # Download Python installer
        Write-Log "Downloading Python installer from $pythonInstallerUrl"
        Invoke-WebRequest -Uri $pythonInstallerUrl -OutFile $pythonInstallerPath

        # Install Python
        Write-Log "Running Python installer"
        Start-Process -FilePath $pythonInstallerPath -ArgumentList "/quiet", "InstallAllUsers=1", "PrependPath=1", "Include_test=0" -Wait

        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        # Verify installation
        if (Test-Command -Command "python") {
            $pythonVersion = & python --version
            Write-Log "Python $pythonVersion installed successfully"
            return $true
        }
        else {
            Write-Log "Python installation failed" -Level "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Error installing Python: $_" -Level "ERROR"
        return $false
    }
    finally {
        # Clean up
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Function to install Git
function Install-Git {
    Write-Log "Installing Git $GIT_VERSION..."

    $tempDir = Join-Path $env:TEMP "video2tool_install"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    $gitInstallerUrl = "https://github.com/git-for-windows/git/releases/download/v$GIT_VERSION.windows.1/Git-$GIT_VERSION-64-bit.exe"
    $gitInstallerPath = Join-Path $tempDir "git-installer.exe"

    try {
        # Download Git installer
        Write-Log "Downloading Git installer from $gitInstallerUrl"
        Invoke-WebRequest -Uri $gitInstallerUrl -OutFile $gitInstallerPath

        # Install Git
        Write-Log "Running Git installer"
        Start-Process -FilePath $gitInstallerPath -ArgumentList "/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-", "/CLOSEAPPLICATIONS", "/RESTARTAPPLICATIONS", "/COMPONENTS=icons,ext\reg\shellhere,assoc,assoc_sh" -Wait

        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        # Verify installation
        if (Test-Command -Command "git") {
            $gitVersion = & git --version
            Write-Log "Git $gitVersion installed successfully"
            return $true
        }
        else {
            Write-Log "Git installation failed" -Level "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Error installing Git: $_" -Level "ERROR"
        return $false
    }
    finally {
        # Clean up
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Function to clone repository
function Clone-Repository {
    param (
        [Parameter(Mandatory=$true)]
        [string]$DestinationPath
    )

    Write-Log "Cloning repository from $REPO_URL to $DestinationPath"

    if (Test-Path $DestinationPath) {
        $confirmation = Read-Host "Destination directory already exists. Do you want to delete it and clone again? (y/n)"
        if ($confirmation -eq 'y') {
            Remove-Item -Path $DestinationPath -Recurse -Force
        }
        else {
            Write-Log "Using existing repository at $DestinationPath"
            return $true
        }
    }

    try {
        git clone $REPO_URL $DestinationPath
        Write-Log "Repository cloned successfully"
        return $true
    }
    catch {
        Write-Log "Error cloning repository: $_" -Level "ERROR"
        return $false
    }
}

# Function to set up backend
function Setup-Backend {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    $backendDir = Join-Path $Config.InstallPath "backend"
    Write-Log "Setting up backend in $backendDir"

    if (-not (Test-Path $backendDir)) {
        Write-Log "Backend directory not found" -Level "ERROR"
        return $false
    }

    try {
        # Create virtual environment
        Set-Location $backendDir
        Write-Log "Creating Python virtual environment"
        python -m venv venv

        # Activate virtual environment
        Write-Log "Activating virtual environment"
        & "$backendDir\venv\Scripts\Activate.ps1"

        # Install dependencies
        Write-Log "Installing backend dependencies"
        pip install --no-cache-dir -r requirements.txt

        # Create .env file
        Write-Log "Creating .env file"
        $envContent = @"
# Database
DATABASE_URL=$($Config.BackendConfig.DatabaseUrl)

# JWT
SECRET_KEY=$($Config.BackendConfig.SecretKey)
ALGORITHM=$($Config.BackendConfig.Algorithm)
ACCESS_TOKEN_EXPIRE_MINUTES=$($Config.BackendConfig.AccessTokenExpireMinutes)

# OpenRouter API
OPENROUTER_API_KEY=$($Config.BackendConfig.OpenRouterApiKey)
OPENROUTER_BASE_URL=$($Config.BackendConfig.OpenRouterBaseUrl)

# Supabase (if using)
SUPABASE_URL=$($Config.BackendConfig.SupabaseUrl)
SUPABASE_KEY=$($Config.BackendConfig.SupabaseKey)

# File Storage
UPLOAD_DIR=$($Config.BackendConfig.UploadDir)
"@
        Set-Content -Path (Join-Path $backendDir ".env") -Value $envContent

        # Create start script
        Write-Log "Creating backend start script"
        $startScriptContent = @"
@echo off
REM Memory optimization for Python
set PYTHONMALLOC=malloc
set PYTHONMALLOCSTATS=0
set PYTHONHASHSEED=0

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start the backend with reduced worker count
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers $($Config.MemoryOptimization.BackendWorkers)
"@
        Set-Content -Path (Join-Path $backendDir "start_backend.bat") -Value $startScriptContent

        Write-Log "Backend setup completed successfully"
        return $true
    }
    catch {
        Write-Log "Error setting up backend: $_" -Level "ERROR"
        return $false
    }
    finally {
        # Deactivate virtual environment if active
        if ($env:VIRTUAL_ENV) {
            deactivate
        }
    }
}

# Function to initialize database
function Initialize-Database {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    $backendDir = Join-Path $Config.InstallPath "backend"
    Write-Log "Initializing database"

    if (-not (Test-Path $backendDir)) {
        Write-Log "Backend directory not found" -Level "ERROR"
        return $false
    }

    try {
        # Activate virtual environment
        Set-Location $backendDir
        & "$backendDir\venv\Scripts\Activate.ps1"

        # Initialize database
        Write-Log "Running database initialization script"
        python -m app.db.init_db

        Write-Log "Database initialized successfully"
        return $true
    }
    catch {
        Write-Log "Error initializing database: $_" -Level "ERROR"
        return $false
    }
    finally {
        # Deactivate virtual environment if active
        if ($env:VIRTUAL_ENV) {
            deactivate
        }
    }
}

# Function to set up frontend
function Setup-Frontend {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    $frontendDir = Join-Path $Config.InstallPath "frontend"
    Write-Log "Setting up frontend in $frontendDir"

    if (-not (Test-Path $frontendDir)) {
        Write-Log "Frontend directory not found" -Level "ERROR"
        return $false
    }

    try {
        # Install dependencies
        Set-Location $frontendDir
        Write-Log "Installing frontend dependencies"
        npm install --no-optional

        # Create .env file
        Write-Log "Creating .env file"
        $envContent = @"
VITE_API_URL=$($Config.FrontendConfig.ApiUrl)
VITE_SOCKET_URL=$($Config.FrontendConfig.SocketUrl)
VITE_ANALYTICS_ID=$($Config.FrontendConfig.AnalyticsId)
"@
        Set-Content -Path (Join-Path $frontendDir ".env") -Value $envContent

        # Create start script
        Write-Log "Creating frontend start script"
        $startScriptContent = @"
@echo off
REM Set Node.js memory limit
set NODE_OPTIONS=--max-old-space-size=$($Config.MemoryOptimization.NodeMemoryLimit)

REM Start the frontend in development mode
npm run dev -- --host 0.0.0.0
"@
        Set-Content -Path (Join-Path $frontendDir "start_frontend.bat") -Value $startScriptContent

        Write-Log "Frontend setup completed successfully"
        return $true
    }
    catch {
        Write-Log "Error setting up frontend: $_" -Level "ERROR"
        return $false
    }
}

# Function to run backend tests
function Run-BackendTests {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    $backendDir = Join-Path $Config.InstallPath "backend"
    Write-Log "Running backend tests"

    if (-not (Test-Path $backendDir)) {
        Write-Log "Backend directory not found" -Level "ERROR"
        return $false
    }

    try {
        # Activate virtual environment
        Set-Location $backendDir
        & "$backendDir\venv\Scripts\Activate.ps1"

        # Run tests
        Write-Log "Running pytest"
        pytest

        Write-Log "Backend tests completed"
        return $true
    }
    catch {
        Write-Log "Error running backend tests: $_" -Level "ERROR"
        return $false
    }
    finally {
        # Deactivate virtual environment if active
        if ($env:VIRTUAL_ENV) {
            deactivate
        }
    }
}

# Function to run frontend tests
function Run-FrontendTests {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    $frontendDir = Join-Path $Config.InstallPath "frontend"
    Write-Log "Running frontend tests"

    if (-not (Test-Path $frontendDir)) {
        Write-Log "Frontend directory not found" -Level "ERROR"
        return $false
    }

    try {
        # Set memory limit
        $env:NODE_OPTIONS = "--max-old-space-size=$($Config.MemoryOptimization.NodeMemoryLimit)"

        # Run tests
        Set-Location $frontendDir
        Write-Log "Running Jest tests"
        npm test

        Write-Log "Frontend tests completed"
        return $true
    }
    catch {
        Write-Log "Error running frontend tests: $_" -Level "ERROR"
        return $false
    }
    finally {
        # Clear memory limit
        $env:NODE_OPTIONS = ""
    }
}

# Function to run Cypress tests
function Run-CypressTests {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    $frontendDir = Join-Path $Config.InstallPath "frontend"
    Write-Log "Running Cypress tests"

    if (-not (Test-Path $frontendDir)) {
        Write-Log "Frontend directory not found" -Level "ERROR"
        return $false
    }

    try {
        # Set memory limit
        $env:NODE_OPTIONS = "--max-old-space-size=$($Config.MemoryOptimization.NodeMemoryLimit)"

        # Run tests
        Set-Location $frontendDir
        Write-Log "Running Cypress tests"
        npm run cypress:run

        Write-Log "Cypress tests completed"
        return $true
    }
    catch {
        Write-Log "Error running Cypress tests: $_" -Level "ERROR"
        return $false
    }
    finally {
        # Clear memory limit
        $env:NODE_OPTIONS = ""
    }
}

# Function to start backend server
function Start-BackendServer {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    $backendDir = Join-Path $Config.InstallPath "backend"
    $startScript = Join-Path $backendDir "start_backend.bat"

    if (-not (Test-Path $startScript)) {
        Write-Log "Backend start script not found" -Level "ERROR"
        return $false
    }

    try {
        Write-Log "Starting backend server"
        Start-Process -FilePath $startScript -WorkingDirectory $backendDir
        Write-Log "Backend server started"
        return $true
    }
    catch {
        Write-Log "Error starting backend server: $_" -Level "ERROR"
        return $false
    }
}

# Function to start frontend server
function Start-FrontendServer {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    $frontendDir = Join-Path $Config.InstallPath "frontend"
    $startScript = Join-Path $frontendDir "start_frontend.bat"

    if (-not (Test-Path $startScript)) {
        Write-Log "Frontend start script not found" -Level "ERROR"
        return $false
    }

    try {
        Write-Log "Starting frontend server"
        Start-Process -FilePath $startScript -WorkingDirectory $frontendDir
        Write-Log "Frontend server started"
        return $true
    }
    catch {
        Write-Log "Error starting frontend server: $_" -Level "ERROR"
        return $false
    }
}

# Function to build for production
function Build-Production {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    Write-Log "Building for production"

    # Build backend
    $backendDir = Join-Path $Config.InstallPath "backend"
    if (-not (Test-Path $backendDir)) {
        Write-Log "Backend directory not found" -Level "ERROR"
        return $false
    }

    # Build frontend
    $frontendDir = Join-Path $Config.InstallPath "frontend"
    if (-not (Test-Path $frontendDir)) {
        Write-Log "Frontend directory not found" -Level "ERROR"
        return $false
    }

    try {
        # Create gunicorn config
        Set-Location $backendDir
        & "$backendDir\venv\Scripts\Activate.ps1"
        pip install gunicorn

        $gunicornConfig = @"
workers = $($Config.MemoryOptimization.BackendWorkers)
worker_class = 'uvicorn.workers.UvicornWorker'
bind = '0.0.0.0:8000'
"@
        Set-Content -Path (Join-Path $backendDir "gunicorn_config.py") -Value $gunicornConfig

        # Create backend start script for production
        $prodStartScript = @"
@echo off
REM Memory optimization for Python
set PYTHONMALLOC=malloc
set PYTHONMALLOCSTATS=0
set PYTHONHASHSEED=0

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start with gunicorn
gunicorn -c gunicorn_config.py app.main:app
"@
        Set-Content -Path (Join-Path $backendDir "start_production.bat") -Value $prodStartScript

        # Build frontend
        Set-Location $frontendDir
        $env:NODE_OPTIONS = "--max-old-space-size=$($Config.MemoryOptimization.NodeMemoryLimit)"
        npm run build

        Write-Log "Production build completed"
        return $true
    }
    catch {
        Write-Log "Error building for production: $_" -Level "ERROR"
        return $false
    }
    finally {
        # Deactivate virtual environment if active
        if ($env:VIRTUAL_ENV) {
            deactivate
        }

        # Clear memory limit
        $env:NODE_OPTIONS = ""
    }
}

# Function to configure backend
function Configure-Backend {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    Write-Log "Configuring backend"

    # Database URL
    $databaseUrl = Read-Host "Enter database URL (default: $($Config.BackendConfig.DatabaseUrl))"
    if ($databaseUrl) {
        $Config.BackendConfig.DatabaseUrl = $databaseUrl
    }

    # Secret Key
    $generateNewKey = Read-Host "Generate new secret key? (y/n) (default: n)"
    if ($generateNewKey -eq 'y') {
        $Config.BackendConfig.SecretKey = [System.Guid]::NewGuid().ToString()
        Write-Log "Generated new secret key: $($Config.BackendConfig.SecretKey)"
    }

    # Access Token Expire Minutes
    $accessTokenExpireMinutes = Read-Host "Enter access token expiration time in minutes (default: $($Config.BackendConfig.AccessTokenExpireMinutes))"
    if ($accessTokenExpireMinutes) {
        $Config.BackendConfig.AccessTokenExpireMinutes = [int]$accessTokenExpireMinutes
    }

    # OpenRouter API Key
    $openRouterApiKey = Read-Host "Enter OpenRouter API Key (leave empty to keep current)" -AsSecureString
    if ($openRouterApiKey.Length -gt 0) {
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($openRouterApiKey)
        $Config.BackendConfig.OpenRouterApiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }

    # OpenRouter Base URL
    $openRouterBaseUrl = Read-Host "Enter OpenRouter Base URL (default: $($Config.BackendConfig.OpenRouterBaseUrl))"
    if ($openRouterBaseUrl) {
        $Config.BackendConfig.OpenRouterBaseUrl = $openRouterBaseUrl
    }

    # Supabase URL
    $supabaseUrl = Read-Host "Enter Supabase URL (leave empty if not using Supabase)"
    if ($supabaseUrl) {
        $Config.BackendConfig.SupabaseUrl = $supabaseUrl
    }

    # Supabase Key
    $supabaseKey = Read-Host "Enter Supabase Key (leave empty if not using Supabase)" -AsSecureString
    if ($supabaseKey.Length -gt 0) {
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($supabaseKey)
        $Config.BackendConfig.SupabaseKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }

    # Upload Directory
    $uploadDir = Read-Host "Enter upload directory (default: $($Config.BackendConfig.UploadDir))"
    if ($uploadDir) {
        $Config.BackendConfig.UploadDir = $uploadDir
    }

    Save-Configuration $Config
    Write-Log "Backend configuration updated"
    return $Config
}

# Function to configure frontend
function Configure-Frontend {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    Write-Log "Configuring frontend"

    # API URL
    $apiUrl = Read-Host "Enter API URL (default: $($Config.FrontendConfig.ApiUrl))"
    if ($apiUrl) {
        $Config.FrontendConfig.ApiUrl = $apiUrl
    }

    # Socket URL
    $socketUrl = Read-Host "Enter Socket URL (default: $($Config.FrontendConfig.SocketUrl))"
    if ($socketUrl) {
        $Config.FrontendConfig.SocketUrl = $socketUrl
    }

    # Analytics ID
    $analyticsId = Read-Host "Enter Analytics ID (leave empty if not using analytics)"
    if ($analyticsId) {
        $Config.FrontendConfig.AnalyticsId = $analyticsId
    }

    Save-Configuration $Config
    Write-Log "Frontend configuration updated"
    return $Config
}

# Function to configure memory optimization
function Configure-MemoryOptimization {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    Write-Log "Configuring memory optimization"

    # Backend Workers
    $backendWorkers = Read-Host "Enter number of backend workers (default: $($Config.MemoryOptimization.BackendWorkers))"
    if ($backendWorkers) {
        $Config.MemoryOptimization.BackendWorkers = [int]$backendWorkers
    }

    # Node Memory Limit
    $nodeMemoryLimit = Read-Host "Enter Node.js memory limit in MB (default: $($Config.MemoryOptimization.NodeMemoryLimit))"
    if ($nodeMemoryLimit) {
        $Config.MemoryOptimization.NodeMemoryLimit = [int]$nodeMemoryLimit
    }

    # Python Memory Optimization
    $pythonMemoryOptimization = Read-Host "Enable Python memory optimization? (y/n) (default: $($Config.MemoryOptimization.PythonMemoryOptimization))"
    if ($pythonMemoryOptimization) {
        $Config.MemoryOptimization.PythonMemoryOptimization = ($pythonMemoryOptimization -eq 'y')
    }

    Save-Configuration $Config
    Write-Log "Memory optimization configuration updated"
    return $Config
}

# Function to display the main menu
function Show-MainMenu {
    param (
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Config
    )

    $installPath = $Config.InstallPath
    $isInstalled = Test-Path $installPath

    while ($true) {
        Clear-Host
        Write-Host "=======================================" -ForegroundColor Green
        Write-Host "     Video2Tool Installation Script    " -ForegroundColor Green
        Write-Host "=======================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Installation Status: " -NoNewline

        if ($isInstalled) {
            Write-Host "Installed" -ForegroundColor Green
        }
        else {
            Write-Host "Not Installed" -ForegroundColor Yellow
        }

        Write-Host "Installation Path: $installPath"
        Write-Host ""
        Write-Host "1. Check Prerequisites"
        Write-Host "2. Install Prerequisites"
        Write-Host "3. Clone Repository"
        Write-Host "4. Setup Backend"
        Write-Host "5. Setup Frontend"
        Write-Host "6. Initialize Database"
        Write-Host "7. Configure Backend"
        Write-Host "8. Configure Frontend"
        Write-Host "9. Configure Memory Optimization"
        Write-Host "10. Start Backend Server"
        Write-Host "11. Start Frontend Server"
        Write-Host "12. Run Backend Tests"
        Write-Host "13. Run Frontend Tests"
        Write-Host "14. Run Cypress Tests"
        Write-Host "15. Build for Production"
        Write-Host "16. Full Installation (Steps 1-6)"
        Write-Host ""
        Write-Host "0. Exit"
        Write-Host ""

        $choice = Read-Host "Enter your choice"

        switch ($choice) {
            "1" {
                Write-Host "`nChecking prerequisites..." -ForegroundColor Cyan
                $missingPrereqs = Test-Prerequisites

                if ($missingPrereqs.Count -eq 0) {
                    Write-Host "All prerequisites are installed." -ForegroundColor Green
                }
                else {
                    Write-Host "Missing prerequisites:" -ForegroundColor Yellow
                    foreach ($prereq in $missingPrereqs) {
                        Write-Host "- $prereq" -ForegroundColor Yellow
                    }
                }

                Read-Host "`nPress Enter to continue"
            }
            "2" {
                Write-Host "`nInstalling prerequisites..." -ForegroundColor Cyan
                $missingPrereqs = Test-Prerequisites

                foreach ($prereq in $missingPrereqs) {
                    Write-Host "Installing $prereq..." -ForegroundColor Cyan
                    $installFunction = "Install-$prereq"

                    if (Get-Command $installFunction -ErrorAction SilentlyContinue) {
                        & $installFunction
                    }
                    else {
                        Write-Host "No installation function found for $prereq" -ForegroundColor Yellow
                    }
                }

                Read-Host "`nPress Enter to continue"
            }
            "3" {
                Write-Host "`nCloning repository..." -ForegroundColor Cyan
                Clone-Repository -DestinationPath $installPath
                $isInstalled = Test-Path $installPath
                Read-Host "`nPress Enter to continue"
            }
            "4" {
                Write-Host "`nSetting up backend..." -ForegroundColor Cyan
                Setup-Backend -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "5" {
                Write-Host "`nSetting up frontend..." -ForegroundColor Cyan
                Setup-Frontend -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "6" {
                Write-Host "`nInitializing database..." -ForegroundColor Cyan
                Initialize-Database -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "7" {
                Write-Host "`nConfiguring backend..." -ForegroundColor Cyan
                $Config = Configure-Backend -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "8" {
                Write-Host "`nConfiguring frontend..." -ForegroundColor Cyan
                $Config = Configure-Frontend -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "9" {
                Write-Host "`nConfiguring memory optimization..." -ForegroundColor Cyan
                $Config = Configure-MemoryOptimization -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "10" {
                Write-Host "`nStarting backend server..." -ForegroundColor Cyan
                Start-BackendServer -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "11" {
                Write-Host "`nStarting frontend server..." -ForegroundColor Cyan
                Start-FrontendServer -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "12" {
                Write-Host "`nRunning backend tests..." -ForegroundColor Cyan
                Run-BackendTests -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "13" {
                Write-Host "`nRunning frontend tests..." -ForegroundColor Cyan
                Run-FrontendTests -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "14" {
                Write-Host "`nRunning Cypress tests..." -ForegroundColor Cyan
                Run-CypressTests -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "15" {
                Write-Host "`nBuilding for production..." -ForegroundColor Cyan
                Build-Production -Config $Config
                Read-Host "`nPress Enter to continue"
            }
            "16" {
                Write-Host "`nPerforming full installation..." -ForegroundColor Cyan

                # Check prerequisites
                Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Cyan
                $missingPrereqs = Test-Prerequisites

                # Install prerequisites
                if ($missingPrereqs.Count -gt 0) {
                    Write-Host "Step 2: Installing prerequisites..." -ForegroundColor Cyan
                    foreach ($prereq in $missingPrereqs) {
                        Write-Host "Installing $prereq..." -ForegroundColor Cyan
                        $installFunction = "Install-$prereq"

                        if (Get-Command $installFunction -ErrorAction SilentlyContinue) {
                            & $installFunction
                        }
                        else {
                            Write-Host "No installation function found for $prereq" -ForegroundColor Yellow
                        }
                    }
                }

                # Clone repository
                Write-Host "Step 3: Cloning repository..." -ForegroundColor Cyan
                Clone-Repository -DestinationPath $installPath
                $isInstalled = Test-Path $installPath

                # Setup backend
                Write-Host "Step 4: Setting up backend..." -ForegroundColor Cyan
                Setup-Backend -Config $Config

                # Setup frontend
                Write-Host "Step 5: Setting up frontend..." -ForegroundColor Cyan
                Setup-Frontend -Config $Config

                # Initialize database
                Write-Host "Step 6: Initializing database..." -ForegroundColor Cyan
                Initialize-Database -Config $Config

                Write-Host "`nFull installation completed!" -ForegroundColor Green
                Read-Host "`nPress Enter to continue"
            }
            "0" {
                return
            }
            default {
                Write-Host "`nInvalid choice. Please try again." -ForegroundColor Yellow
                Read-Host "`nPress Enter to continue"
            }
        }
    }
}

# Main execution
try {
    # Check if running as administrator
    if (-not (Test-Administrator)) {
        Write-Host "This script requires administrator privileges to install prerequisites." -ForegroundColor Yellow
        Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit
    }

    # Load configuration
    $config = Load-Configuration

    # Show main menu
    Show-MainMenu -Config $config

    Write-Host "Thank you for using the Video2Tool installation script!" -ForegroundColor Green
}
catch {
    Write-Log "An error occurred: $_" -Level "ERROR"
    Write-Host "An error occurred: $_" -ForegroundColor Red
    Write-Host "Please check the log file at $LOG_FILE for details." -ForegroundColor Red
    Read-Host "Press Enter to exit"
}