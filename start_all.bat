@echo off
echo Starting Video2Tool with automatic port management...

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Kill any existing node processes (be careful with this in a production environment)
echo Stopping any existing servers...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 > nul

REM Check and free up ports
echo Checking and freeing up ports...
netstat -ano | findstr ":8000" | findstr "LISTENING" > nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
        echo Terminating process with PID %%a using port 8000...
        taskkill /F /PID %%a
    )
)

netstat -ano | findstr ":3000" | findstr "LISTENING" > nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
        echo Terminating process with PID %%a using port 3000...
        taskkill /F /PID %%a
    )
)

REM Start the backend server in a new window
echo Starting backend server...
start "Video2Tool Backend" cmd /c "cd backend && node server.js > ..\logs\backend.log 2>&1"

REM Wait a moment for the backend to initialize
timeout /t 5 > nul

REM Start the frontend server in a new window
echo Starting frontend server...
start "Video2Tool Frontend" cmd /c "cd frontend && npm run dev -- --host 0.0.0.0 > ..\logs\frontend.log 2>&1"

echo.
echo Video2Tool servers are starting...
echo.
echo Backend server logs: logs\backend.log
echo Frontend server logs: logs\frontend.log
echo.
echo Press any key to stop all servers...
pause > nul

REM Kill all node processes (be careful with this in a production environment)
echo Stopping all servers...
taskkill /F /IM node.exe /T

echo.
echo All servers stopped.
echo.