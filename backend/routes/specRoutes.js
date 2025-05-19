const express = require('express');
const { generateSpecification, getSpecification, getProjectSpecifications } = require('../controllers/specController');
const { protect, optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Apply rate limiting
router.use(apiLimiter);

// Routes
router.post('/generate', optionalAuth, generateSpecification);
router.get('/:id', protect, getSpecification);
router.get('/project/:projectId', protect, getProjectSpecifications);

module.exports = router;
