const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const multer = require('multer');

// Load environment variables
dotenv.config();

// Set NODE_ENV to development if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Import utilities
const logger = require('./utils/logger');
const socketService = require('./utils/socket');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const rootRoutes = require('./routes/rootRoutes');
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const specRoutes = require('./routes/specRoutes');
const taskRoutes = require('./routes/taskRoutes');
const exportRoutes = require('./routes/exportRoutes');
const integrationRoutes = require('./routes/integrationRoutes');

// Create Express app
const app = express();

// Set up middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(compression()); // Compress responses
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // HTTP request logging

// Set up multer for handling multipart/form-data
const upload = multer();
app.use('/api/auth/token', upload.none()); // Handle form data for auth token endpoint

// Create upload directories if they don't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const tempDir = process.env.TEMP_DIR || './temp';
const outputDir = process.env.OUTPUT_DIR || './output';

[uploadDir, tempDir, outputDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Set up static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// Set up API routes
app.use('/', rootRoutes); // Root route handler
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/specifications', specRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/integrations', integrationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Initialize Socket.IO
socketService.init(server);
logger.info('Socket.IO initialized');

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Don't crash the server in production
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

module.exports = app; // Export for testing
