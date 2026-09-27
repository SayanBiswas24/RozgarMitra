const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');
const env = require('../config/env');

/**
 * Authentication Controller
 * Lean HTTP interface delegating business operations to AuthService.
 */
class AuthController {
  static async register(req, res, next) {
    try {
      const result = await AuthService.registerUser(req.body, req);
      return ApiResponse.success(res, 'Registration successful.', result, 201);
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.loginUser(req.body, req);
      return ApiResponse.success(res, 'Login successful.', result);
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const tokens = await AuthService.refreshAuthToken(req.body.refreshToken, req);
      return ApiResponse.success(res, 'Token refreshed successfully.', { tokens });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      await AuthService.logoutUser(req.body.refreshToken, req.user, req);
      return ApiResponse.success(res, 'Successfully logged out.');
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      return ApiResponse.success(res, 'User profile retrieved.', {
        user: req.user.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changeUserPassword(req.user._id, currentPassword, newPassword, req);
      return ApiResponse.success(res, 'Password changed successfully. Please log in with your new password.');
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const rawResetToken = await AuthService.requestPasswordReset(req.body.email, req);
      const genericMsg = 'If an account exists with that email, a password reset token has been generated.';
      const data = env.NODE_ENV !== 'production' && rawResetToken ? { resetToken: rawResetToken } : null;
      return ApiResponse.success(res, genericMsg, data);
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      await AuthService.resetUserPassword(token, newPassword, req);
      return ApiResponse.success(res, 'Password has been successfully reset. You can now log in.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/pincode/:pincode
   * Public pincode lookup for registration — no auth required
   */
  static async lookupPincode(req, res, next) {
    try {
      const ProfileService = require('../services/profileService');
      const { pincode } = req.params;
      const locationData = await ProfileService.lookupPincode(pincode);
      return ApiResponse.success(res, 'Pincode location resolved successfully.', locationData);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
