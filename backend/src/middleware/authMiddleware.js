const { verifyAccessToken } = require('../utils/tokenUtils');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { ACCOUNT_STATUS } = require('../constants/accountStatus');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const { logAudit } = require('../utils/auditLogger');

/**
 * Authentication Middleware:
 * Answers: "Who is this user?"
 * Verifies Bearer JWT, validates user existence and account status.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Authentication required. Missing or invalid Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return ApiResponse.error(res, 'Authentication token missing.', 401);
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return ApiResponse.error(res, 'Authentication token has expired. Please refresh your token.', 401);
      }
      return ApiResponse.error(res, 'Invalid authentication token.', 401);
    }

    if (!decoded || !decoded.sub) {
      return ApiResponse.error(res, 'Invalid token payload.', 401);
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return ApiResponse.error(res, 'User account no longer exists.', 401);
    }

    // Enforce account status policy
    if (user.status === ACCOUNT_STATUS.SUSPENDED) {
      return ApiResponse.error(res, 'Account is suspended. Please contact administrator.', 403);
    }
    if (user.status === ACCOUNT_STATUS.BLOCKED) {
      return ApiResponse.error(res, 'Account is blocked.', 403);
    }
    if (user.status === ACCOUNT_STATUS.DEACTIVATED) {
      return ApiResponse.error(res, 'Account has been deactivated.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Authorization Middleware:
 * Answers: "Is this authenticated user allowed to perform this operation?"
 * Enforces Role-Based Access Control (RBAC).
 */
function authorize(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required before authorization.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      await logAudit({
        actor: {
          userId: req.user._id,
          email: req.user.email,
          role: req.user.role
        },
        action: AUDIT_ACTIONS.UNAUTHORIZED_ACCESS_ATTEMPT,
        target: {
          resourceType: 'ROUTE',
          resourceId: req.originalUrl
        },
        status: 'FAILURE',
        details: {
          requiredRoles: allowedRoles,
          userRole: req.user.role,
          method: req.method
        },
        req
      });

      return ApiResponse.error(
        res,
        `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}].`,
        403
      );
    }

    next();
  };
}

/**
 * Optional Authentication Middleware:
 * If a valid Bearer token is present, sets req.user.
 * If not present or expired/invalid, quietly continues with req.user = null.
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (_) {
      req.user = null;
      return next();
    }

    if (decoded && decoded.sub) {
      const user = await User.findById(decoded.sub);
      if (user && user.status === ACCOUNT_STATUS.ACTIVE) {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize
};
