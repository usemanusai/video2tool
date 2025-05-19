/**
 * Port management utility for the frontend server
 * Checks if a port is in use and terminates the process if needed
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configure logging
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'port-manager.log');

/**
 * Log a message to both console and log file
 * @param {string} message - The message to log
 * @param {string} level - The log level (info, warn, error)
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  console.log(formattedMessage);
  
  fs.appendFileSync(logFile, formattedMessage + '\n');
}

/**
 * Check if a port is in use
 * @param {number} port - The port to check
 * @returns {boolean} - True if the port is in use, false otherwise
 */
function isPortInUse(port) {
  try {
    // Use netstat to check if the port is in use
    const command = `netstat -ano | findstr :${port} | findstr LISTENING`;
    const output = execSync(command, { encoding: 'utf8' });
    
    return output.trim().length > 0;
  } catch (error) {
    // If the command fails, the port is not in use
    return false;
  }
}

/**
 * Get the PID of the process using a specific port
 * @param {number} port - The port to check
 * @returns {number|null} - The PID of the process using the port, or null if not found
 */
function getProcessIdForPort(port) {
  try {
    const command = `netstat -ano | findstr :${port} | findstr LISTENING`;
    const output = execSync(command, { encoding: 'utf8' });
    
    // Extract the PID from the output (last column)
    const lines = output.trim().split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0];
      const columns = firstLine.trim().split(/\s+/);
      const pid = columns[columns.length - 1];
      return parseInt(pid, 10);
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Terminate a process by its PID
 * @param {number} pid - The PID of the process to terminate
 * @returns {boolean} - True if the process was terminated successfully, false otherwise
 */
function terminateProcess(pid) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
    return true;
  } catch (error) {
    log(`Failed to terminate process with PID ${pid}: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Free up a port by terminating the process using it
 * @param {number} port - The port to free up
 * @returns {boolean} - True if the port was freed up successfully, false otherwise
 */
function freeUpPort(port) {
  log(`Checking if port ${port} is in use...`, 'info');
  
  if (!isPortInUse(port)) {
    log(`Port ${port} is not in use.`, 'info');
    return true;
  }
  
  const pid = getProcessIdForPort(port);
  if (!pid) {
    log(`Could not find process ID for port ${port}.`, 'warn');
    return false;
  }
  
  log(`Port ${port} is in use by process with PID ${pid}. Attempting to terminate...`, 'warn');
  
  const terminated = terminateProcess(pid);
  if (terminated) {
    log(`Successfully terminated process with PID ${pid} using port ${port}.`, 'info');
    return true;
  } else {
    log(`Failed to free up port ${port}.`, 'error');
    return false;
  }
}

module.exports = {
  isPortInUse,
  getProcessIdForPort,
  terminateProcess,
  freeUpPort,
  log
};
