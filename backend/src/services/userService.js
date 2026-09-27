const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { ROLE_LIST } = require('../constants/roles');
const { ACCOUNT_STATUS, ACCOUNT_STATUS_LIST } = require('../constants/accountStatus');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const { logAudit } = require('../utils/auditLogger');

/**
 * User Service
 * Encapsulates profile management, user administration, and status workflows.
 */
class UserService {
  /**
   * Update profile with strict mass assignment whitelisting
   */
  static async updateProfile(userId, { name, phone, profile }, req = null) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    if (name && typeof name === 'string') {
      user.name = name.trim();
    }
    if (phone && typeof phone === 'string') {
      const phoneExists = await User.findOne({ phone: phone.trim(), _id: { $ne: user._id } });
      if (phoneExists) {
        const err = new Error('Phone number is already associated with another account.');
        err.statusCode = 409;
        throw err;
      }
      user.phone = phone.trim();
    }

    if (profile && typeof profile === 'object') {
      if (profile.bio !== undefined) user.profile.bio = String(profile.bio).substring(0, 500);
      if (profile.location !== undefined) user.profile.location = String(profile.location);
      if (profile.district !== undefined) user.profile.district = String(profile.district);
      if (profile.state !== undefined) user.profile.state = String(profile.state);
      if (Array.isArray(profile.skills)) user.profile.skills = profile.skills.map(String);
      if (profile.preferredLanguage !== undefined) user.profile.preferredLanguage = String(profile.preferredLanguage);
    }

    await user.save();

    if (req) {
      await logAudit({
        actor: { userId: user._id, email: user.email, role: user.role },
        action: AUDIT_ACTIONS.PROFILE_UPDATED,
        target: { resourceType: 'USER', resourceId: user._id.toString() },
        status: 'SUCCESS',
        req
      });
    }

    return user.toJSON();
  }

  /**
   * List users with pagination and search (Admin)
   */
  static async listUsers({ page = 1, limit = 20, role, status, search }) {
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (currentPage - 1) * pageLimit;

    const filter = {};
    if (role && ROLE_LIST.includes(role)) {
      filter.role = role;
    }
    if (status && ACCOUNT_STATUS_LIST.includes(status)) {
      filter.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageLimit),
      User.countDocuments(filter)
    ]);

    return {
      users: users.map((u) => u.toJSON()),
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit)
      }
    };
  }

  /**
   * Update user status (Admin)
   */
  static async updateUserStatus(userId, status, adminUser, reason = '', req = null) {
    if (!ACCOUNT_STATUS_LIST.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: [${ACCOUNT_STATUS_LIST.join(', ')}].`);
      err.statusCode = 400;
      throw err;
    }

    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    // Admins cannot lock/suspend themselves
    if (user._id.toString() === adminUser._id.toString() && status !== ACCOUNT_STATUS.ACTIVE) {
      const err = new Error('Admins cannot suspend or block their own account.');
      err.statusCode = 400;
      throw err;
    }

    const previousStatus = user.status;
    user.status = status;
    await user.save();

    // Revoke tokens on suspension or blocking
    if (status === ACCOUNT_STATUS.SUSPENDED || status === ACCOUNT_STATUS.BLOCKED || status === ACCOUNT_STATUS.DEACTIVATED) {
      await RefreshToken.updateMany(
        { user: user._id, revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    if (req) {
      await logAudit({
        actor: { userId: adminUser._id, email: adminUser.email, role: adminUser.role },
        action: AUDIT_ACTIONS.STATUS_CHANGED,
        target: { resourceType: 'USER', resourceId: user._id.toString() },
        status: 'SUCCESS',
        details: { previousStatus, newStatus: status, reason },
        req
      });
    }

    return user.toJSON();
  }

  /**
   * Update user role (Admin)
   */
  static async updateUserRole(userId, role, adminUser, req = null) {
    if (!ROLE_LIST.includes(role)) {
      const err = new Error(`Invalid role. Must be one of: [${ROLE_LIST.join(', ')}].`);
      err.statusCode = 400;
      throw err;
    }

    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    // Force re-authentication with new role claims
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { revokedAt: new Date() }
    );

    if (req) {
      await logAudit({
        actor: { userId: adminUser._id, email: adminUser.email, role: adminUser.role },
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        target: { resourceType: 'USER', resourceId: user._id.toString() },
        status: 'SUCCESS',
        details: { previousRole, newRole: role },
        req
      });
    }

    return user.toJSON();
  }

  /**
   * Aggregate statistics
   */
  static async getSystemStats() {
    const [totalUsers, activeUsers, suspendedUsers, roleBreakdown] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: ACCOUNT_STATUS.ACTIVE }),
      User.countDocuments({ status: ACCOUNT_STATUS.SUSPENDED }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      roleBreakdown: roleBreakdown.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };
  }
}

module.exports = UserService;
