const UserService = require('../services/userService');
const ApiResponse = require('../utils/apiResponse');

/**
 * User Controller
 * Lean HTTP interface delegating to UserService.
 */
class UserController {
  static async getProfile(req, res, next) {
    try {
      return ApiResponse.success(res, 'Profile retrieved.', {
        user: req.user.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const updatedUser = await UserService.updateProfile(req.user._id, req.body, req);
      return ApiResponse.success(res, 'Profile updated successfully.', {
        user: updatedUser
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
