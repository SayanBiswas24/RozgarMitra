const trainingService = require('../services/trainingService');
const ApiResponse = require('../utils/apiResponse');

class TrainingController {
  /**
   * @route   GET /api/training/categories
   * @desc    Get all distinct training sectors/categories from the dataset
   * @access  Public
   */
  async getCategories(req, res, next) {
    try {
      const categories = trainingService.getCategories();
      return ApiResponse.success(res, 'Training categories retrieved.', {
        count: categories.length,
        categories
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * @route   GET /api/training/opportunities
   * @route   GET /api/training
   * @desc    Get training opportunities with search, filtering, geo-distance, and pagination
   * @access  Public (Personalized if token provided)
   */
  async getOpportunities(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        sector,
        mode,
        state,
        district,
        latitude,
        longitude,
        radius
      } = req.query;

      // Extract user coordinates and profile preferences if logged in
      let userLat = latitude ? parseFloat(latitude) : null;
      let userLon = longitude ? parseFloat(longitude) : null;
      let userRadius = radius ? parseFloat(radius) : null;
      let userDistrict = district || null;
      let userState = state || null;
      let userProfile = null;

      if (req.user && req.user.profile) {
        const prof = req.user.profile;
        if (userLat === null && prof.location?.coordinates?.latitude) {
          userLat = prof.location.coordinates.latitude;
        }
        if (userLon === null && prof.location?.coordinates?.longitude) {
          userLon = prof.location.coordinates.longitude;
        }

        userProfile = {
          education: prof.education || prof.about_you?.education || prof.aboutYou?.education || null,
          occupation: prof.occupation || prof.about_you?.occupation || prof.aboutYou?.occupation || null,
          occupation_type: prof.occupation_type || prof.about_you?.occupation_type || null,
          skills: [
            ...(Array.isArray(prof.skills) ? prof.skills : []),
            ...(Array.isArray(prof.other_skills) ? prof.other_skills : [])
          ],
          interests: [
            ...(Array.isArray(prof.interests) ? prof.interests : []),
            ...(Array.isArray(prof.other_interests) ? prof.other_interests : [])
          ],
          workPreference:
            prof.workPreferences?.workTypePreference ||
            prof.work_preferences?.work_type_preference ||
            prof.work_preferences?.workTypePreference ||
            prof.workPreferences?.work_type_preference ||
            null,
          district: prof.location?.district || null,
          state: prof.location?.state || null,
          gender: prof.gender || null,
          age: prof.age || null
        };
      }

      // Allow query parameter overrides for testing/personalization
      if (req.query.education || req.query.occupation || req.query.skills || req.query.interests || req.query.workPreference) {
        userProfile = userProfile || {};
        if (req.query.education) userProfile.education = req.query.education;
        if (req.query.occupation) userProfile.occupation = req.query.occupation;
        if (req.query.skills) {
          userProfile.skills = Array.isArray(req.query.skills)
            ? req.query.skills
            : req.query.skills.split(',').map((x) => x.trim());
        }
        if (req.query.interests) {
          userProfile.interests = Array.isArray(req.query.interests)
            ? req.query.interests
            : req.query.interests.split(',').map((x) => x.trim());
        }
        if (req.query.workPreference) userProfile.workPreference = req.query.workPreference;
      }

      const result = trainingService.getOpportunities({
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
        search,
        category,
        sector,
        mode,
        state: userState,
        district: userDistrict,
        userLat,
        userLon,
        mobilityRadius: userRadius,
        userProfile
      });

      return ApiResponse.success(res, 'Training opportunities retrieved.', {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        count: result.opportunities.length,
        opportunities: result.opportunities
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * @route   GET /api/training/:id
   * @desc    Get complete 68-field dataset details for a specific training opportunity
   * @access  Public (Personalized distance if user location known)
   */
  async getOpportunityById(req, res, next) {
    try {
      const { id } = req.params;

      let userCoords = null;
      if (req.query.latitude && req.query.longitude) {
        userCoords = {
          latitude: parseFloat(req.query.latitude),
          longitude: parseFloat(req.query.longitude)
        };
      } else if (req.user?.profile?.location?.coordinates?.latitude) {
        userCoords = {
          latitude: req.user.profile.location.coordinates.latitude,
          longitude: req.user.profile.location.coordinates.longitude
        };
      }

      const opp = trainingService.getOpportunityById(id, userCoords);
      if (!opp) {
        return ApiResponse.error(res, `Training opportunity with ID '${id}' not found.`, 404);
      }

      return ApiResponse.success(res, 'Training opportunity details retrieved.', {
        opportunity: opp
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * @route   GET /api/training/near-you
   * @desc    Get top opportunities near user location for Home screen
   * @access  Public
   */
  async getNearYou(req, res, next) {
    try {
      let userLat = req.query.latitude ? parseFloat(req.query.latitude) : null;
      let userLon = req.query.longitude ? parseFloat(req.query.longitude) : null;
      let userDistrict = req.query.district || null;
      let userState = req.query.state || null;

      if (req.user && req.user.profile) {
        const prof = req.user.profile;
        if (userLat === null && prof.location?.coordinates?.latitude) {
          userLat = prof.location.coordinates.latitude;
        }
        if (userLon === null && prof.location?.coordinates?.longitude) {
          userLon = prof.location.coordinates.longitude;
        }
        if (!userDistrict && prof.location?.district) {
          userDistrict = prof.location.district;
        }
        if (!userState && prof.location?.state) {
          userState = prof.location.state;
        }
      }

      const limit = parseInt(req.query.limit, 10) || 3;
      const opportunities = trainingService.getNearYou({
        userLat,
        userLon,
        district: userDistrict,
        state: userState,
        limit
      });

      return ApiResponse.success(res, 'Near-you opportunities retrieved.', {
        count: opportunities.length,
        opportunities
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TrainingController();
