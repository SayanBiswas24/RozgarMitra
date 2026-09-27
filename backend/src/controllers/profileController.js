const ProfileService = require('../services/profileService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Profile Controller
 * Lean HTTP interface delegating to ProfileService.
 */
class ProfileController {
  /**
   * GET /api/profile
   * Returns user identity, About You, Work Preferences, Progress %, and Prediction status
   */
  static async getProfile(req, res, next) {
    try {
      const profileData = await ProfileService.getCompleteProfile(req.user._id);
      return ApiResponse.success(res, 'Profile retrieved successfully.', profileData);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/profile (or PUT /api/profile)
   * Progressive profile update: updates partial fields and recalculates progress & prediction readiness
   */
  static async updateProfile(req, res, next) {
    try {
      const updatedProfile = await ProfileService.updateProgressiveProfile(req.user._id, req.body, req);
      return ApiResponse.success(res, 'Profile updated successfully.', updatedProfile);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/profile/progress (or GET /api/progress)
   * Feeds the "Your progress" card on the Home page
   */
  static async getProgress(req, res, next) {
    try {
      const profileData = await ProfileService.getCompleteProfile(req.user._id);
      const { progress, prediction } = profileData;

      // Suggest the highest impact next step to complete
      let nextStep = 'Your profile is complete!';
      if (progress.missingSections.includes('education')) {
        nextStep = 'Add your education details to unlock relevant courses.';
      } else if (progress.missingSections.includes('skills')) {
        nextStep = 'Add your skills so Saathi can match you with local opportunities.';
      } else if (progress.missingSections.includes('location')) {
        nextStep = 'Add your district to find training centers near you.';
      } else if (progress.missingSections.includes('interests')) {
        nextStep = 'Tell us your interests to discover new livelihood options.';
      } else if (progress.missingSections.includes('workPreferences')) {
        nextStep = 'Specify your work and travel preferences.';
      }

      return ApiResponse.success(res, 'Progress retrieved successfully.', {
        completionPercentage: progress.completionPercentage,
        status: progress.status,
        completedSections: progress.completedSections,
        missingSections: progress.missingSections,
        nextStep,
        predictionReadiness: prediction.readiness,
        canRecommend: prediction.canRecommend
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/recommendations (or GET /api/profile/recommendations)
   * Returns personalized training & livelihood suggestions when ready
   */
  static async getRecommendations(req, res, next) {
    try {
      const result = await ProfileService.getUserRecommendations(req.user._id);
      return ApiResponse.success(res, 'Recommendations retrieved.', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/profile/pincode/:pincode
   * Resolves official Postal location data + reliable geocoding
   */
  static async lookupPincode(req, res, next) {
    try {
      const { pincode } = req.params;
      const locationData = await ProfileService.lookupPincode(pincode);
      return ApiResponse.success(res, 'Pincode location resolved successfully.', locationData);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProfileController;
