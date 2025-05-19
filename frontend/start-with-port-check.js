/**
 * Script to check and free up port 3000 before starting the frontend server
 */
const { spawn } = require('child_process');
const { freeUpPort, log } = require('./utils/port-manager');

// Frontend port
const FRONTEND_PORT = 3000;

// Free up the port
const portFreed = freeUpPort(FRONTEND_PORT);

if (!portFreed) {
  log(`Warning: Could not free up port ${FRONTEND_PORT}. The server may fail to start.`, 'warn');
}

// Get command line arguments
const args = process.argv.slice(2);

// Start the frontend server using Vite
log(`Starting frontend server on port ${FRONTEND_PORT}...`, 'info');

// Determine the command to run based on the environment
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Set memory limit
process.env.NODE_OPTIONS = '--max-old-space-size=2048';

// Start the server
const server = spawn(npmCmd, ['run', 'dev:original', '--', ...args], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (error) => {
  log(`Failed to start frontend server: ${error.message}`, 'error');
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  log('Received SIGINT. Shutting down frontend server...', 'info');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM. Shutting down frontend server...', 'info');
  server.kill();
  process.exit(0);
});
