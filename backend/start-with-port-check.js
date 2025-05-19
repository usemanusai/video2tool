/**
 * Script to check and free up port 8000 before starting the backend server
 */
const { spawn } = require('child_process');
const { freeUpPort } = require('./utils/port-manager');
const logger = require('./utils/logger');

// Backend port
const BACKEND_PORT = 8000;

// Free up the port
const portFreed = freeUpPort(BACKEND_PORT);

if (!portFreed) {
  logger.warn(`Warning: Could not free up port ${BACKEND_PORT}. The server may fail to start.`);
}

// Get command line arguments
const args = process.argv.slice(2);

// Start the backend server
logger.info(`Starting backend server on port ${BACKEND_PORT}...`);

// Set memory limit
process.env.NODE_OPTIONS = '--max-old-space-size=2048';

// Start the server
const server = spawn('node', ['server.js', ...args], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd() // Ensure we're in the correct directory
});

server.on('error', (error) => {
  logger.error(`Failed to start backend server: ${error.message}`);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down backend server...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down backend server...');
  server.kill();
  process.exit(0);
});
