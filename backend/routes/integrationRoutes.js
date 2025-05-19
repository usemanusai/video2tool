const express = require('express');
const { getIntegrationTypes, getInitializedIntegrations, authenticateIntegration, exportToIntegration } = require('../controllers/integrationController');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Apply rate limiting
router.use(apiLimiter);

// Routes
router.get('/types', getIntegrationTypes);
router.get('/initialized', getInitializedIntegrations);
router.post('/auth', authenticateIntegration);
router.post('/export/:integrationType', protect, exportToIntegration);

module.exports = router;
