const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const contestRoutes = require('./contestRoutes');
const reminderRoutes = require('./reminderRoutes');
const statsRoutes = require('./statsRoutes');

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contests', contestRoutes);
router.use('/reminders', reminderRoutes);
router.use('/stats', statsRoutes);

module.exports = router;
