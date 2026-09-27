const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const ApiResponse = require('../utils/apiResponse');

/**
 * Government Official Controller
 * Dedicated endpoints for Government Official portal
 */

/**
 * Get beneficiary list for verification
 */
async function getBeneficiaries(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { role: ROLES.USER };
    if (req.query.district) {
      filter['profile.district'] = new RegExp(req.query.district.trim(), 'i');
    }
    if (req.query.state) {
      filter['profile.state'] = new RegExp(req.query.state.trim(), 'i');
    }

    const [beneficiaries, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    return ApiResponse.success(res, 'Beneficiaries retrieved successfully.', {
      beneficiaries: beneficiaries.map((b) => b.toJSON()),
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

/**
 * Verify beneficiary details
 */
async function verifyBeneficiary(req, res, next) {
  try {
    const { beneficiaryId, notes } = req.body;
    const user = await User.findById(beneficiaryId);
    if (!user || user.role !== ROLES.USER) {
      return ApiResponse.error(res, 'Beneficiary not found.', 404);
    }

    return ApiResponse.success(res, 'Beneficiary verification updated.', {
      beneficiaryId: user._id,
      verifiedBy: req.user.email,
      department: req.user.profile?.department || 'Employment Directorate',
      notes: notes || 'Verified successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBeneficiaries,
  verifyBeneficiary
};
