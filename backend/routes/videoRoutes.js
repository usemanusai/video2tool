const express = require('express');
const { uploadVideo, processVideoUrl, getTaskStatus, getVideoAnalysis } = require('../controllers/videoController');
const { protect, optionalAuth } = require('../middleware/auth');
const { videoUpload, handleMulterError } = require('../middleware/upload');
const { videoProcessingLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Apply rate limiting to video processing routes
router.use(['/upload', '/process-url'], videoProcessingLimiter);

// Routes
router.post('/upload', optionalAuth, videoUpload.single('video'), handleMulterError, uploadVideo);
router.post('/process-url', optionalAuth, processVideoUrl);
router.get('/task/:taskId', getTaskStatus);
router.get('/analysis/:id', protect, getVideoAnalysis);

module.exports = router;
