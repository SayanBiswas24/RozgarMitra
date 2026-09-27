const UserService = require('../services/userService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');

/**
 * Admin Controller
 * Lean HTTP interface delegating to UserService.
 */
class AdminController {
  static async getUsers(req, res, next) {
    try {
      const result = await UserService.listUsers(req.query);
      return ApiResponse.success(res, 'Users retrieved successfully.', result);
    } catch (err) {
      next(err);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return ApiResponse.error(res, 'User not found.', 404);
      }
      return ApiResponse.success(res, 'User details retrieved.', {
        user: user.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateUserStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      const user = await UserService.updateUserStatus(req.params.id, status, req.user, reason, req);
      return ApiResponse.success(res, `User status updated to ${status}.`, { user });
    } catch (err) {
      next(err);
    }
  }

  static async updateUserRole(req, res, next) {
    try {
      const { role } = req.body;
      const user = await UserService.updateUserRole(req.params.id, role, req.user, req);
      return ApiResponse.success(res, `User role updated to ${role}.`, { user });
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.action) filter.action = req.query.action;
      if (req.query.status) filter.status = req.query.status;

      const [logs, total] = await Promise.all([
        AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
        AuditLog.countDocuments(filter)
      ]);

      return ApiResponse.success(res, 'Audit logs retrieved.', {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSystemStats(req, res, next) {
    try {
      const stats = await UserService.getSystemStats();
      return ApiResponse.success(res, 'System stats retrieved.', stats);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
