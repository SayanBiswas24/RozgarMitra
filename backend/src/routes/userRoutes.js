const express = require('express');
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users/profile
 * @desc    Get complete authenticated user profile
 * @access  Protected
 */
router.get('/profile', profileController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update authenticated user profile
 * @access  Protected
 */
router.put('/profile', profileController.updateProfile);

/**
 * @route   PATCH /api/users/profile
 * @desc    Progressively update user profile
 * @access  Protected
 */
router.patch('/profile', profileController.updateProfile);

module.exports = router;
