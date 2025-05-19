/**
 * Standalone script to check and free up port 8000
 */
const { freeUpPort } = require('./port-manager');
const logger = require('./logger');

// Get port from command line arguments or use default
const port = process.argv[2] ? parseInt(process.argv[2], 10) : 8000;

// Free up the port
const portFreed = freeUpPort(port);

if (portFreed) {
  logger.info(`Port ${port} is now available.`);
  process.exit(0);
} else {
  logger.error(`Failed to free up port ${port}.`);
  process.exit(1);
}
