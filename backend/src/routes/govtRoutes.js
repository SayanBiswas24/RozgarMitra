const express = require('express');
const { body } = require('express-validator');
const govtController = require('../controllers/govtController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validateMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// Govt routes accessible by GOVT_OFFICIAL and ADMIN
router.use(authenticate, authorize(ROLES.GOVT_OFFICIAL, ROLES.ADMIN));

/**
 * @route   GET /api/govt/beneficiaries
 * @desc    View list of beneficiaries for government schemes
 * @access  Govt Official / Admin Only
 */
router.get('/beneficiaries', govtController.getBeneficiaries);

/**
 * @route   POST /api/govt/verify
 * @desc    Verify a beneficiary application
 * @access  Govt Official / Admin Only
 */
router.post(
  '/verify',
  [
    body('beneficiaryId').isMongoId().withMessage('Valid beneficiary ID is required'),
    body('notes').optional().trim(),
    validateRequest
  ],
  govtController.verifyBeneficiary
);

module.exports = router;
