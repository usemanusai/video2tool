/**
 * Standalone script to check and free up port 3000
 */
const { freeUpPort, log } = require('./port-manager');

// Get port from command line arguments or use default
const port = process.argv[2] ? parseInt(process.argv[2], 10) : 3000;

// Free up the port
const portFreed = freeUpPort(port);

if (portFreed) {
  log(`Port ${port} is now available.`, 'info');
  process.exit(0);
} else {
  log(`Failed to free up port ${port}.`, 'error');
  process.exit(1);
}
