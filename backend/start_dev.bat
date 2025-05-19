@echo off
REM Set Node.js memory limit
set NODE_OPTIONS=--max-old-space-size=2048

REM Start the backend server in development mode
npx nodemon server.js
