const express = require('express');
const { exportSpecification, exportTasks, exportComplete } = require('../controllers/exportController');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Apply rate limiting
router.use(apiLimiter);

// Routes
router.post('/specification/:id', protect, exportSpecification);
router.post('/tasks/:id', protect, exportTasks);
router.post('/complete/:specId/:tasksId', protect, exportComplete);

module.exports = router;
