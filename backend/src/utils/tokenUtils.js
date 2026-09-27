const security = require('./security');

module.exports = {
  generateAccessToken: security.generateAccessToken,
  generateSecureRandomToken: security.generateSecureRandomToken,
  hashToken: security.hashToken,
  verifyAccessToken: security.verifyAccessToken,
  validatePasswordStrength: security.validatePasswordStrength
};
