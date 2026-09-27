const express = require('express');
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// All profile, progress, and recommendation routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/profile
 * @desc    Get complete profile with About You, Work Preferences, Progress %, and Prediction status
 * @access  Protected
 */
router.get('/', profileController.getProfile);

/**
 * @route   PATCH /api/profile
 * @desc    Progressively update profile sections (Education, Occupation, Skills, Location, etc.)
 * @access  Protected
 */
router.patch('/', profileController.updateProfile);

/**
 * @route   PUT /api/profile
 * @desc    Support PUT as alias for clients that send PUT requests
 * @access  Protected
 */
router.put('/', profileController.updateProfile);

/**
 * @route   GET /api/profile/progress
 * @desc    Get real-time data for Home "Your progress" card
 * @access  Protected
 */
router.get('/progress', profileController.getProgress);

/**
 * @route   GET /api/profile/recommendations
 * @desc    Get personalized training and livelihood recommendations
 * @access  Protected
 */
router.get('/recommendations', profileController.getRecommendations);

/**
 * @route   GET /api/profile/pincode/:pincode
 * @desc    Lookup official postal location data by PIN code
 * @access  Protected
 */
router.get('/pincode/:pincode', profileController.lookupPincode);

module.exports = router;
