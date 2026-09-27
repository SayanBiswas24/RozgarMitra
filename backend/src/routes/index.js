const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const profileRoutes = require('./profileRoutes');
const adminRoutes = require('./adminRoutes');
const govtRoutes = require('./govtRoutes');
const trainingRoutes = require('./trainingRoutes');
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/authMiddleware');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  return ApiResponse.success(res, 'Rojgar Mitra API is online and healthy.', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Mount core routers
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/training', trainingRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/govt', govtRoutes);

// Direct top-level aliases for frontend convenience
router.get('/progress', authenticate, profileController.getProgress);
router.get('/recommendations', authenticate, profileController.getRecommendations);

module.exports = router;
