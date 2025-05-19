const express = require('express');
const router = express.Router();

// Root route handler
router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Video2Tool API',
        version: '1.0.0',
        endpoints: [
            '/api/auth',
            '/api/videos',
            '/api/specifications',
            '/api/tasks',
            '/api/export',
            '/api/integrations',
            '/api/health'
        ]
    });
});

module.exports = router;