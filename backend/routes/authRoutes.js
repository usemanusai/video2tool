const express = require('express');
const { registerUser, loginUser, getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Apply rate limiting to authentication routes
router.use(authLimiter);

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);

module.exports = router;
