@echo off
echo Starting frontend with automatic port management...

REM Run the port check script and start the frontend
node start-with-port-check.js --host 0.0.0.0
