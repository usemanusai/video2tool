const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Serve the main application
router.get('/', (req, res) => {
  // Check if we have a built frontend
  const frontendBuildPath = path.join(__dirname, '../../frontend/dist/index.html');
  const frontendDevPath = path.join(__dirname, '../../frontend/index.html');
  
  if (fs.existsSync(frontendBuildPath)) {
    // Serve built frontend
    res.sendFile(frontendBuildPath);
  } else if (fs.existsSync(frontendDevPath)) {
    // Serve development frontend
    res.sendFile(frontendDevPath);
  } else {
    // Fallback response
    res.json({
      message: 'Video2Tool Backend API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        videos: '/api/videos',
        specifications: '/api/specifications',
        tasks: '/api/tasks',
        export: '/api/export',
        integrations: '/api/integrations'
      }
    });
  }
});

// API info endpoint
router.get('/api', (req, res) => {
  res.json({
    message: 'Video2Tool API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      videos: '/api/videos',
      specifications: '/api/specifications',
      tasks: '/api/tasks',
      export: '/api/export',
      integrations: '/api/integrations'
    }
  });
});

module.exports = router;
