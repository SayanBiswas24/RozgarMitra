const express = require('express');
const { body, param } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validateMiddleware');
const { ROLES } = require('../constants/roles');
const { ACCOUNT_STATUS_LIST } = require('../constants/accountStatus');

const router = express.Router();

// Strict RBAC: All admin routes require ADMIN role
router.use(authenticate, authorize(ROLES.ADMIN));

/**
 * @route   GET /api/admin/users
 * @desc    Get paginated user list with filters
 * @access  Admin Only
 */
router.get('/users', adminController.getUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details by ID
 * @access  Admin Only
 */
router.get(
  '/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid MongoDB ObjectId format'),
    validateRequest
  ],
  adminController.getUserById
);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Update user status (ACTIVE, SUSPENDED, BLOCKED, etc.)
 * @access  Admin Only
 */
router.patch(
  '/users/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid MongoDB ObjectId format'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(ACCOUNT_STATUS_LIST)
      .withMessage(`Status must be one of: [${ACCOUNT_STATUS_LIST.join(', ')}]`),
    validateRequest
  ],
  adminController.updateUserStatus
);

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Update user role (USER, GOVT_OFFICIAL, ADMIN)
 * @access  Admin Only
 */
router.patch(
  '/users/:id/role',
  [
    param('id').isMongoId().withMessage('Invalid MongoDB ObjectId format'),
    body('role')
      .notEmpty()
      .withMessage('Role is required')
      .isIn([ROLES.USER, ROLES.GOVT_OFFICIAL, ROLES.ADMIN])
      .withMessage(`Role must be one of: [${ROLES.USER}, ${ROLES.GOVT_OFFICIAL}, ${ROLES.ADMIN}]`),
    validateRequest
  ],
  adminController.updateUserRole
);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    View system audit logs
 * @access  Admin Only
 */
router.get('/audit-logs', adminController.getAuditLogs);

/**
 * @route   GET /api/admin/stats
 * @desc    View system overview statistics
 * @access  Admin Only
 */
router.get('/stats', adminController.getSystemStats);

module.exports = router;
