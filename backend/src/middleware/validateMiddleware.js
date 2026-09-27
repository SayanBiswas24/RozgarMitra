const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware to check validation results from express-validator
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return ApiResponse.error(res, 'Validation failed. Please check input fields.', 400, formattedErrors);
  }
  next();
}

module.exports = {
  validateRequest
};
