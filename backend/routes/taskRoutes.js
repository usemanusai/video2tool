const express = require('express');
const { createTasks, getTasks, getSpecificationTasks, updateTask } = require('../controllers/taskController');
const { protect, optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Apply rate limiting
router.use(apiLimiter);

// Routes
router.post('/create', optionalAuth, createTasks);
router.get('/:id', protect, getTasks);
router.get('/specification/:specificationId', protect, getSpecificationTasks);
router.put('/:id', protect, updateTask);

module.exports = router;
