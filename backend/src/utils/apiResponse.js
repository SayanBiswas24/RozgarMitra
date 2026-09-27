/**
 * Standardized API Response Helper
 */
class ApiResponse {
  static success(res, message = 'Success', data = null, statusCode = 200) {
    const payload = {
      success: true,
      message
    };
    if (data !== null) {
      payload.data = data;
    }
    return res.status(statusCode).json(payload);
  }

  static error(res, message = 'Internal server error', statusCode = 500, errors = null) {
    const payload = {
      success: false,
      message
    };
    if (errors !== null) {
      payload.errors = errors;
    }
    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
