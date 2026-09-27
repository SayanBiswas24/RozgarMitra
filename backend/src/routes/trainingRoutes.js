const express = require('express');
const trainingController = require('../controllers/trainingController');
const { optionalAuthenticate } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/training/categories
 * @desc    Get all distinct training sectors/categories from the real dataset
 * @access  Public
 */
router.get('/categories', trainingController.getCategories);

/**
 * @route   GET /api/training/near-you
 * @desc    Get top/featured opportunities near the user
 * @access  Public (Optional auth for personalized location)
 */
router.get('/near-you', optionalAuthenticate, trainingController.getNearYou);

/**
 * @route   GET /api/training/opportunities
 * @route   GET /api/training
 * @desc    Get paginated, searchable, filterable real training opportunities
 * @access  Public (Optional auth for personalized distance & radius filtering)
 */
router.get('/opportunities', optionalAuthenticate, trainingController.getOpportunities);
router.get('/', optionalAuthenticate, trainingController.getOpportunities);

/**
 * @route   GET /api/training/:id
 * @desc    Get complete 68-field dataset details for a specific training opportunity
 * @access  Public (Optional auth for personalized distance)
 */
router.get('/:id', optionalAuthenticate, trainingController.getOpportunityById);

module.exports = router;
